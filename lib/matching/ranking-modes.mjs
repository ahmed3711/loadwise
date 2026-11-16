// =====================================================================
// Ranking modes: how much each part of the score counts (FR-08)
//
// A dispatcher ranks loads differently on different days: sometimes the
// best money matters most, sometimes the truck must not drive empty, and
// sometimes the driver needs to get home. A mode is just a set of weights
// (percentages that add up to 100), so switching mode only re-scores and
// re-sorts the loads that were already checked.
// =====================================================================
export const RANKING_MODES = Object.freeze([
  {
    id: "balanced",
    name: "Balanced",
    description: "A bit of everything: good pay, few empty miles and good lanes.",
    weights: { rpm: 50, deadhead: 30, lane: 20 },
  },
  {
    id: "max-profit",
    name: "Max Profit",
    description: "The highest net rate per mile wins, even if the truck drives further empty.",
    weights: { rpm: 80, deadhead: 10, lane: 10 },
  },
  {
    id: "least-empty",
    name: "Least Empty Miles",
    description: "Pick up close to where the truck is now, to save fuel and time.",
    weights: { rpm: 20, deadhead: 70, lane: 10 },
  },
  {
    id: "home-lanes",
    name: "Home Lanes",
    description: "Prefer loads in the carrier's preferred and home states, for driver home time.",
    weights: { rpm: 30, deadhead: 20, lane: 50 },
  },
]);

export const DEFAULT_MODE_ID = RANKING_MODES[0].id;

// Finds a mode by id (unknown id -> Balanced)
export function getMode(id) {
  return RANKING_MODES.find((mode) => mode.id === id) ?? RANKING_MODES[0];
}

// How many points each part gave (for "Why this score?")
export function explainScore(parts, weights) {
  return Object.entries(weights).map(([part, weight]) => ({
    part,
    weight,
    value: parts[part],
    points: Math.round(parts[part] * weight * 10) / 10,
  }));
}

