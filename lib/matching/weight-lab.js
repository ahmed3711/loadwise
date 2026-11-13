import "server-only";
import { brokerRisk } from "@/lib/brokers/risk.mjs";
import { estimateRoadMiles } from "./us-places.mjs";
import {
  agreement,
  carrierWeights,
  checkFit,
  componentScores,
  DEFAULT_WEIGHTS,
  netRatePerMile,
} from "./scoring.mjs";
import { runWeightSearch } from "@/lib/threads/pool.mjs";

// Weight Lab: "which score weights best match the loads this dispatcher
// actually booked?" (proposal: compare weight sets against historical loads)
//
// For every past booking we look at the other loads that were on offer
// around the same pickup date and also fitted the same vehicle. Each
// (booked load, passed-over load) is one "pair". A good weight set gives
// the booked load the higher score in as many pairs as possible.

const WINDOW_DAYS = 3; // "on offer at the same time" = pickup within 3 days
export const MIN_PAIRS = 10;

export async function buildHistoryPairs(supabase, carrierId) {
  const { data: carrier } = await supabase.from("carriers").select("*").eq("id", carrierId).maybeSingle();
  if (!carrier) return null;

  const [{ data: bookings }, { data: allBookings }, { data: loads }, { data: brokers }] = await Promise.all([
    supabase.from("bookings").select("*, loads(*), vehicles(*)").eq("carrier_id", carrierId),
    supabase.from("bookings").select("load_id"),
    supabase.from("loads").select("*"),
    supabase.from("brokers").select("*"),
  ]);

  const brokerByMc = new Map((brokers ?? []).map((b) => [b.mc_number, b]));
  const home = { city: carrier.home_city, state: carrier.home_state };

  // Empty miles are estimated from the carrier's home base for every
  // historical load, so booked and passed-over loads are treated the same.
  function componentsFor(load, vehicle) {
    const deadheadMiles = estimateRoadMiles(home, { city: load.origin_city, state: load.origin_state });
    return componentScores({
      netRpm: netRatePerMile({
        rate: load.rate_usd,
        loadedMiles: load.loaded_miles,
        deadheadMiles,
        fuelCostPerMile: vehicle.fuel_cost_per_mile ?? 0.6,
      }),
      minRatePerMile: carrier.min_rate_per_mile,
      loadedMiles: load.loaded_miles,
      deadheadMiles,
      originState: load.origin_state,
      destinationState: load.destination_state,
      homeState: carrier.home_state,
      preferredStates: carrier.preferred_states,
      brokerRisk: brokerRisk(brokerByMc.get(load.broker_mc)),
    });
  }

  // Loads booked on any of your vehicles weren't "passed on", so skip them
  const bookedIds = new Set((allBookings ?? []).map((b) => b.load_id));
  const pairs = [];

  for (const booking of bookings ?? []) {
    const chosen = booking.loads;
    const vehicle = booking.vehicles;
    if (!chosen || !vehicle) continue;
    const chosenComponents = componentsFor(chosen, vehicle);

    for (const other of loads ?? []) {
      if (other.id === chosen.id || bookedIds.has(other.id)) continue;
      if (daysApart(other.pickup_date, chosen.pickup_date) > WINDOW_DAYS) continue;
      if (!checkFit(other, vehicle).fits) continue;
      pairs.push({ chosen: chosenComponents, other: componentsFor(other, vehicle) });
    }
  }

  return { carrier, pairs, bookingCount: (bookings ?? []).length };
}

export async function runWeightLab(supabase, carrierId) {
  const history = await buildHistoryPairs(supabase, carrierId);
  if (!history) return null;

  const { carrier, pairs, bookingCount } = history;
  const current = carrierWeights(carrier);
  const base = {
    carrier: { id: carrier.id, company_name: carrier.company_name },
    bookingCount,
    pairCount: pairs.length,
    current: { weights: current, agreement: agreement(current, pairs) },
    defaults: { weights: { ...DEFAULT_WEIGHTS }, agreement: agreement(DEFAULT_WEIGHTS, pairs) },
  };

  if (pairs.length < MIN_PAIRS) {
    return { ...base, enoughData: false };
  }

  // 1% steps = 176,851 weight sets, split across worker threads
  const search = await runWeightSearch({ pairs, step: 1, keep: 5 });
  return { ...base, enoughData: true, ...search };
}

function daysApart(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}
