// =====================================================================
// LoadWise Matching Engine: the maths (FR-05, FR-07, FR-08)
//
// This file has NO imports on purpose. The same code is used by:
//   - the Matching page (server),
//   - the worker threads of the Weight Lab (lib/threads, workers/), and
//   - the Jest unit tests (tests/).
// So the ranking a dispatcher sees is exactly the ranking that is tested.
// =====================================================================

// Default score weights from the proposal (percentages, add up to 100)
export const DEFAULT_WEIGHTS = { rpm: 40, deadhead: 25, lane: 20, broker: 15 };

export const WEIGHT_KEYS = ["rpm", "deadhead", "lane", "broker"];

// Which vehicle types can carry a load posted for each equipment type.
// A reefer (refrigerated van) can also carry normal dry-van freight.
// (Same rule as public.equipment_can_carry() in schema-part2.sql.)
export const CAN_CARRY = {
  cargo_van: ["cargo_van"],
  box_truck: ["box_truck"],
  dry_van: ["dry_van", "reefer"],
  reefer: ["reefer"],
  flatbed: ["flatbed"],
};

// Broker risk -> 0..1 points for the "broker trust" part of the score
export const BROKER_POINTS = { low: 1, unknown: 0.5, high: 0 };

// ---------------------------------------------------------------------
// Step 1. Hard fit filter (FR-05)
// Returns { fits: true/false, reasons: [...] } so the dispatcher can see
// exactly why a load was left out.
// ---------------------------------------------------------------------
export function checkFit(load, vehicle) {
  const reasons = [];
  const allowed = CAN_CARRY[load.equipment_type] ?? [load.equipment_type];

  if (!allowed.includes(vehicle.equipment_type)) {
    reasons.push(`Needs ${label(load.equipment_type)}, vehicle is ${label(vehicle.equipment_type)}`);
  }
  if (Number(load.weight_lbs) > Number(vehicle.max_payload_lbs)) {
    reasons.push(`Weight ${num(load.weight_lbs)} lbs > payload ${num(vehicle.max_payload_lbs)} lbs`);
  }
  if (Number(load.pallet_count) > Number(vehicle.max_pallets)) {
    reasons.push(`${load.pallet_count} pallets > ${vehicle.max_pallets} pallet spaces`);
  }
  if (Number(load.length_ft) > Number(vehicle.length_ft)) {
    reasons.push(`Length ${load.length_ft} ft > ${vehicle.length_ft} ft interior`);
  }

  return { fits: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------
// Step 2. Net rate per mile (FR-07)
// (rate - deadhead fuel cost) / (loaded miles + deadhead miles)
// ---------------------------------------------------------------------
export function netRatePerMile({ rate, loadedMiles, deadheadMiles, fuelCostPerMile }) {
  const totalMiles = Number(loadedMiles) + Number(deadheadMiles);
  if (totalMiles <= 0) return 0;
  const deadheadCost = Number(deadheadMiles) * Number(fuelCostPerMile);
  return round2((Number(rate) - deadheadCost) / totalMiles);
}

// Share of all driven miles that are empty (0 to 1)
export function emptyMileShare(loadedMiles, deadheadMiles) {
  const total = Number(loadedMiles) + Number(deadheadMiles);
  return total > 0 ? Number(deadheadMiles) / total : 0;
}

// ---------------------------------------------------------------------
// Step 3a. The four parts of the score, each between 0 and 1
// ---------------------------------------------------------------------
export function componentScores({
  netRpm,
  minRatePerMile,
  loadedMiles,
  deadheadMiles,
  originState,
  destinationState,
  homeState,
  preferredStates = [],
  brokerRisk = "unknown",
}) {
  // Net RPM: 0 points at half the carrier's minimum, 0.5 at the minimum,
  // full points at 1.5x the minimum or more.
  const min = Number(minRatePerMile) > 0 ? Number(minRatePerMile) : 2;
  const rpm = clamp01((Number(netRpm) - 0.5 * min) / min);

  // Empty miles: full points with no empty miles, 0 points at 50% or more.
  const deadhead = clamp01(1 - emptyMileShare(loadedMiles, deadheadMiles) / 0.5);

  // Preferred lanes: half a point each for starting and ending in a
  // preferred state (the home state always counts, for driver home time).
  const preferred = new Set([...(preferredStates ?? []), homeState].filter(Boolean));
  const lane = (preferred.has(originState) ? 0.5 : 0) + (preferred.has(destinationState) ? 0.5 : 0);

  const broker = BROKER_POINTS[brokerRisk] ?? BROKER_POINTS.unknown;

  return { rpm, deadhead, lane, broker };
}

// ---------------------------------------------------------------------
// Step 3b. Weighted score from 0 to 100 (FR-08)
// weights are percentages, e.g. { rpm: 40, deadhead: 25, lane: 20, broker: 15 }
// ---------------------------------------------------------------------
export function weightedScore(components, weights = DEFAULT_WEIGHTS) {
  let total = 0;
  for (const key of WEIGHT_KEYS) {
    total += (components[key] ?? 0) * (weights[key] ?? 0);
  }
  return Math.round(total);
}

// Same as weightedScore but without rounding, for comparing weight sets
export function rawScore(components, weights) {
  return (
    components.rpm * weights.rpm +
    components.deadhead * weights.deadhead +
    components.lane * weights.lane +
    components.broker * weights.broker
  );
}

export function weightsAreValid(weights) {
  return (
    WEIGHT_KEYS.every((key) => Number.isInteger(weights[key]) && weights[key] >= 0 && weights[key] <= 100) &&
    WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0) === 100
  );
}

// Reads the weights saved on a carrier row
export function carrierWeights(carrier) {
  if (!carrier || carrier.weight_rpm == null) return { ...DEFAULT_WEIGHTS };
  return {
    rpm: carrier.weight_rpm,
    deadhead: carrier.weight_deadhead,
    lane: carrier.weight_lane,
    broker: carrier.weight_broker,
  };
}

// ---------------------------------------------------------------------
// Everything together for one load
// ctx = { vehicle, carrier, weights, deadheadMiles, brokerRisk }
// ---------------------------------------------------------------------
export function scoreLoad(load, { vehicle, carrier, weights, deadheadMiles, brokerRisk }) {
  const netRpm = netRatePerMile({
    rate: load.rate_usd,
    loadedMiles: load.loaded_miles,
    deadheadMiles,
    fuelCostPerMile: vehicle.fuel_cost_per_mile ?? 0.6,
  });

  const components = componentScores({
    netRpm,
    minRatePerMile: carrier.min_rate_per_mile,
    loadedMiles: load.loaded_miles,
    deadheadMiles,
    originState: load.origin_state,
    destinationState: load.destination_state,
    homeState: carrier.home_state,
    preferredStates: carrier.preferred_states,
    brokerRisk,
  });

  return {
    load,
    deadheadMiles,
    netRpm,
    emptyShare: emptyMileShare(load.loaded_miles, deadheadMiles),
    belowMinimum: netRpm < Number(carrier.min_rate_per_mile),
    brokerRisk,
    components,
    score: weightedScore(components, weights),
  };
}

// ---------------------------------------------------------------------
// Rank a list of loads for one vehicle.
// deadheadByLoad: Map(load.id -> miles), riskByMc: Map(mc -> risk)
// Returns { ranked: [...best first], excluded: [{ load, reasons }] }
// ---------------------------------------------------------------------
export function rankLoads(loads, { vehicle, carrier, weights, deadheadByLoad, riskByMc }) {
  const ranked = [];
  const excluded = [];

  for (const load of loads) {
    const fit = checkFit(load, vehicle);
    if (!fit.fits) {
      excluded.push({ load, reasons: fit.reasons });
      continue;
    }
    ranked.push(
      scoreLoad(load, {
        vehicle,
        carrier,
        weights,
        deadheadMiles: deadheadByLoad.get(load.id) ?? 0,
        brokerRisk: riskByMc.get(load.broker_mc) ?? "unknown",
      })
    );
  }

  // Best score first; ties go to the higher net rate per mile, then earlier pickup
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.netRpm - a.netRpm ||
      String(a.load.pickup_date).localeCompare(String(b.load.pickup_date))
  );

  return { ranked, excluded };
}

// ---------------------------------------------------------------------
// Weight Lab helpers (used by the worker threads)
// ---------------------------------------------------------------------

// Every weight set in steps of `step` % that adds up to 100.
// step 1 -> 176,851 sets, step 5 -> 1,771 sets.
export function allWeightSets(step = 5) {
  const sets = [];
  for (let rpm = 0; rpm <= 100; rpm += step) {
    for (let deadhead = 0; deadhead <= 100 - rpm; deadhead += step) {
      for (let lane = 0; lane <= 100 - rpm - deadhead; lane += step) {
        sets.push({ rpm, deadhead, lane, broker: 100 - rpm - deadhead - lane });
      }
    }
  }
  return sets;
}

// pairs: [{ chosen: components, other: components }]
// "Agreement" = share of pairs where this weight set scores the load the
// dispatcher actually booked higher than a load they passed on.
// A tie counts as half. Returns a number from 0 to 1.
export function agreement(weights, pairs) {
  if (pairs.length === 0) return 0;
  let points = 0;
  for (const pair of pairs) {
    const chosen = rawScore(pair.chosen, weights);
    const other = rawScore(pair.other, weights);
    if (chosen > other + 1e-9) points += 1;
    else if (Math.abs(chosen - other) <= 1e-9) points += 0.5;
  }
  return points / pairs.length;
}

// Evaluate a list of weight sets and keep the best `keep` of them.
// onEach() is called after every set (the worker uses it to update the
// shared progress counter).
export function bestWeightSets(weightSets, pairs, keep = 5, onEach = () => {}) {
  const best = [];
  for (const weights of weightSets) {
    const value = agreement(weights, pairs);
    // Only touch the top list when this set could get into it
    const worst = best[best.length - 1];
    if (best.length < keep || value >= worst.agreement) {
      insertTop(best, { weights, agreement: value }, keep);
    }
    onEach();
  }
  return best;
}

// Keeps `list` sorted best first and at most `keep` long.
// Ties prefer weight sets closer to the default ones (more balanced).
export function insertTop(list, item, keep) {
  list.push(item);
  list.sort((a, b) => b.agreement - a.agreement || distanceFromDefault(a.weights) - distanceFromDefault(b.weights));
  if (list.length > keep) list.length = keep;
  return list;
}

export function distanceFromDefault(weights) {
  return WEIGHT_KEYS.reduce((sum, key) => sum + Math.abs(weights[key] - DEFAULT_WEIGHTS[key]), 0);
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------
export function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function num(value) {
  return Number(value).toLocaleString("en-US");
}

const EQUIPMENT_LABELS = {
  cargo_van: "cargo van",
  box_truck: "box truck",
  dry_van: "dry van",
  reefer: "reefer",
  flatbed: "flatbed",
};

function label(type) {
  return EQUIPMENT_LABELS[type] ?? type;
}
