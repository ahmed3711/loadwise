// =====================================================================
// LoadWise Matching Engine: the maths (FR-06, FR-07, FR-08)
//
// This file has NO imports on purpose. The same code runs in:
//   - the browser (Matching page),
//   - the server (Stability Check API), and
//   - the Jest unit tests,
// so the ranking a dispatcher sees is exactly the ranking that is tested.
// (The fit filter, FR-05, is in fit-checks.mjs.)
// =====================================================================

// The three parts of every score
export const PARTS = ["rpm", "deadhead", "lane"];

export const DEFAULT_FUEL_COST = 0.6; // US$ per empty mile

// ---------------------------------------------------------------------
// Net rate per mile (FR-07)
// (rate - empty-mile fuel cost) / (loaded miles + empty miles)
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
// The three parts of the score, each between 0 and 1 (FR-08)
// ---------------------------------------------------------------------
export function partScores({ netRpm, minRatePerMile, loadedMiles, deadheadMiles, originState, destinationState, homeState, preferredStates = [] }) {
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

  return { rpm, deadhead, lane };
}

// Everything about one load for one vehicle, except the final score
// (the score depends on the ranking mode, see ranking-modes.mjs).
export function evaluateLoad(load, { carrier, deadheadMiles, fuelCostPerMile = DEFAULT_FUEL_COST }) {
  const netRpm = netRatePerMile({
    rate: load.rate_usd,
    loadedMiles: load.loaded_miles,
    deadheadMiles,
    fuelCostPerMile,
  });

  const parts = partScores({
    netRpm,
    minRatePerMile: carrier.min_rate_per_mile,
    loadedMiles: load.loaded_miles,
    deadheadMiles,
    originState: load.origin_state,
    destinationState: load.destination_state,
    homeState: carrier.home_state,
    preferredStates: carrier.preferred_states,
  });

  return {
    load,
    deadheadMiles,
    netRpm,
    emptyShare: emptyMileShare(load.loaded_miles, deadheadMiles),
    belowMinimum: netRpm < Number(carrier.min_rate_per_mile),
    parts,
  };
}

// Weighted score from 0 to 100. weights are percentages adding up to 100.
export function weightedScore(parts, weights) {
  return Math.round(rawScore(parts, weights));
}

export function rawScore(parts, weights) {
  return parts.rpm * weights.rpm + parts.deadhead * weights.deadhead + parts.lane * weights.lane;
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

