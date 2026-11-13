import "server-only";
import { todayString } from "@/lib/format";
import { brokerRisk } from "@/lib/brokers/risk.mjs";
import { carrierWeights, rankLoads, scoreLoad, checkFit } from "./scoring.mjs";
import { deadheadMilesFor } from "./distance";

// Server side of the Matching Engine: loads the data from Supabase
// (Row Level Security applies) and runs the maths in scoring.mjs.

// Where the truck is now: its current location, or the carrier's home base
export function truckLocation(vehicle, carrier) {
  if (vehicle.current_city && vehicle.current_state) {
    return { city: vehicle.current_city, state: vehicle.current_state, isHomeBase: false };
  }
  return { city: carrier.home_city, state: carrier.home_state, isHomeBase: true };
}

export async function getVehicleWithCarrier(supabase, vehicleId) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, carriers(*)")
    .eq("id", vehicleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Ranks every available, future load for one vehicle (FR-05 to FR-08)
export async function rankForVehicle(supabase, vehicleId) {
  const started = performance.now();

  const vehicle = await getVehicleWithCarrier(supabase, vehicleId);
  if (!vehicle) return null;
  const carrier = vehicle.carriers;

  const { data: loads, error } = await supabase
    .from("loads")
    .select("*")
    .eq("status", "available")
    .gte("pickup_date", todayString())
    .order("pickup_date", { ascending: true });
  if (error) throw new Error(error.message);

  const riskByMc = await brokerRisksFor(supabase, loads.map((load) => load.broker_mc));

  // Only loads that fit need a distance
  const fitting = loads.filter((load) => checkFit(load, vehicle).fits);
  const from = truckLocation(vehicle, carrier);
  const { miles, source } = await deadheadMilesFor(
    from,
    fitting.map((load) => ({ id: load.id, city: load.origin_city, state: load.origin_state }))
  );

  const weights = carrierWeights(carrier);
  const { ranked, excluded } = rankLoads(loads, {
    vehicle,
    carrier,
    weights,
    deadheadByLoad: miles,
    riskByMc: riskByMc.risk,
  });

  return {
    vehicle,
    carrier,
    weights,
    from,
    ranked,
    excluded,
    brokers: riskByMc.brokers,
    distanceSource: source,
    totalLoads: loads.length,
    elapsedMs: Math.round(performance.now() - started),
  };
}

// Scores one load for one vehicle (used when booking)
export async function scoreOneLoad(supabase, vehicle, load) {
  const carrier = vehicle.carriers;
  const fit = checkFit(load, vehicle);
  const { risk, brokers } = await brokerRisksFor(supabase, [load.broker_mc]);
  const { miles } = await deadheadMilesFor(truckLocation(vehicle, carrier), [
    { id: load.id, city: load.origin_city, state: load.origin_state },
  ]);

  const result = scoreLoad(load, {
    vehicle,
    carrier,
    weights: carrierWeights(carrier),
    deadheadMiles: miles.get(load.id) ?? 0,
    brokerRisk: risk.get(load.broker_mc) ?? "unknown",
  });

  return { ...result, fit, broker: brokers.get(load.broker_mc) ?? null };
}

// Looks up saved broker checks. Returns { risk: Map(mc -> level), brokers: Map(mc -> row) }
export async function brokerRisksFor(supabase, mcNumbers) {
  const unique = [...new Set(mcNumbers.filter(Boolean))];
  const risk = new Map();
  const brokers = new Map();
  if (unique.length === 0) return { risk, brokers };

  const { data } = await supabase.from("brokers").select("*").in("mc_number", unique);
  for (const broker of data ?? []) brokers.set(broker.mc_number, broker);
  for (const mc of unique) risk.set(mc, brokerRisk(brokers.get(mc)));
  return { risk, brokers };
}
