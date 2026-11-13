// Unit tests for the Matching Engine maths (lib/matching/scoring.mjs)
import {
  agreement,
  allWeightSets,
  bestWeightSets,
  carrierWeights,
  checkFit,
  componentScores,
  DEFAULT_WEIGHTS,
  netRatePerMile,
  rankLoads,
  weightedScore,
  weightsAreValid,
} from "../lib/matching/scoring.mjs";

const boxTruck = {
  equipment_type: "box_truck",
  length_ft: 26,
  max_payload_lbs: 10000,
  max_pallets: 12,
  fuel_cost_per_mile: 0.5,
};

const carrier = {
  home_state: "TX",
  preferred_states: ["OK", "LA"],
  min_rate_per_mile: 2,
  weight_rpm: 40,
  weight_deadhead: 25,
  weight_lane: 20,
  weight_broker: 15,
};

function load(overrides = {}) {
  return {
    id: 1,
    equipment_type: "box_truck",
    weight_lbs: 8000,
    pallet_count: 10,
    length_ft: 20,
    rate_usd: 2000,
    loaded_miles: 800,
    origin_state: "TX",
    destination_state: "OK",
    broker_mc: "111111",
    pickup_date: "2026-12-01",
    ...overrides,
  };
}

describe("checkFit (FR-05 hard fit filter)", () => {
  test("a load within every limit fits", () => {
    expect(checkFit(load(), boxTruck)).toEqual({ fits: true, reasons: [] });
  });

  test("a load exactly at the limits still fits", () => {
    const atLimit = load({ weight_lbs: 10000, pallet_count: 12, length_ft: 26 });
    expect(checkFit(atLimit, boxTruck).fits).toBe(true);
  });

  test("too heavy, too many pallets and too long are all reported", () => {
    const result = checkFit(load({ weight_lbs: 10001, pallet_count: 13, length_ft: 27 }), boxTruck);
    expect(result.fits).toBe(false);
    expect(result.reasons).toHaveLength(3);
  });

  test("wrong equipment type does not fit", () => {
    const result = checkFit(load({ equipment_type: "flatbed" }), boxTruck);
    expect(result.fits).toBe(false);
    expect(result.reasons[0]).toMatch(/flatbed/);
  });

  test("a reefer can carry dry-van freight, but not the other way round", () => {
    const reefer = { ...boxTruck, equipment_type: "reefer", length_ft: 53, max_payload_lbs: 44000, max_pallets: 26 };
    const dryVan = { ...reefer, equipment_type: "dry_van" };
    expect(checkFit(load({ equipment_type: "dry_van" }), reefer).fits).toBe(true);
    expect(checkFit(load({ equipment_type: "reefer" }), dryVan).fits).toBe(false);
  });
});

describe("netRatePerMile (FR-07)", () => {
  test("(rate - deadhead fuel cost) / (loaded + deadhead miles)", () => {
    // (2000 - 100 * 0.5) / (800 + 100) = 1950 / 900 = 2.1666...
    expect(netRatePerMile({ rate: 2000, loadedMiles: 800, deadheadMiles: 100, fuelCostPerMile: 0.5 })).toBe(2.17);
  });

  test("with no empty miles it is the plain rate per mile", () => {
    expect(netRatePerMile({ rate: 1500, loadedMiles: 600, deadheadMiles: 0, fuelCostPerMile: 0.5 })).toBe(2.5);
  });

  test("zero miles does not divide by zero", () => {
    expect(netRatePerMile({ rate: 100, loadedMiles: 0, deadheadMiles: 0, fuelCostPerMile: 0.5 })).toBe(0);
  });
});

describe("componentScores and weightedScore (FR-08)", () => {
  const base = {
    minRatePerMile: 2,
    loadedMiles: 800,
    homeState: "TX",
    preferredStates: ["OK"],
  };

  test("perfect load scores 100 with any weights", () => {
    const parts = componentScores({
      ...base,
      netRpm: 3, // 1.5 x minimum
      deadheadMiles: 0,
      originState: "TX",
      destinationState: "OK",
      brokerRisk: "low",
    });
    expect(parts).toEqual({ rpm: 1, deadhead: 1, lane: 1, broker: 1 });
    expect(weightedScore(parts, DEFAULT_WEIGHTS)).toBe(100);
  });

  test("net RPM exactly at the carrier minimum gets half the RPM points", () => {
    const parts = componentScores({ ...base, netRpm: 2, deadheadMiles: 0, originState: "TX", destinationState: "OK" });
    expect(parts.rpm).toBe(0.5);
  });

  test("50% empty miles gets no empty-mile points", () => {
    const parts = componentScores({ ...base, netRpm: 2, deadheadMiles: 800, originState: "TX", destinationState: "OK" });
    expect(parts.deadhead).toBe(0);
  });

  test("lane points: half for origin, half for destination in preferred/home states", () => {
    const parts = componentScores({ ...base, netRpm: 2, deadheadMiles: 0, originState: "CA", destinationState: "TX" });
    expect(parts.lane).toBe(0.5);
  });

  test("broker points: low 1, not verified 0.5, high 0", () => {
    const score = (brokerRisk) =>
      componentScores({ ...base, netRpm: 2, deadheadMiles: 0, originState: "TX", destinationState: "OK", brokerRisk }).broker;
    expect([score("low"), score("unknown"), score("high")]).toEqual([1, 0.5, 0]);
  });

  test("weights must be whole numbers that add up to 100", () => {
    expect(weightsAreValid({ rpm: 40, deadhead: 25, lane: 20, broker: 15 })).toBe(true);
    expect(weightsAreValid({ rpm: 40, deadhead: 25, lane: 20, broker: 10 })).toBe(false);
    expect(weightsAreValid({ rpm: 40.5, deadhead: 24.5, lane: 20, broker: 15 })).toBe(false);
  });

  test("carrierWeights reads the saved weights, or the defaults", () => {
    expect(carrierWeights(carrier)).toEqual({ rpm: 40, deadhead: 25, lane: 20, broker: 15 });
    expect(carrierWeights({})).toEqual(DEFAULT_WEIGHTS);
  });
});

describe("rankLoads", () => {
  test("drops loads that don't fit and sorts the rest best first", () => {
    const loads = [
      load({ id: 1, rate_usd: 1600 }), // ok, lower pay
      load({ id: 2, rate_usd: 2600 }), // ok, best pay
      load({ id: 3, weight_lbs: 20000 }), // too heavy
    ];
    const { ranked, excluded } = rankLoads(loads, {
      vehicle: boxTruck,
      carrier,
      weights: carrierWeights(carrier),
      deadheadByLoad: new Map([
        [1, 50],
        [2, 50],
      ]),
      riskByMc: new Map([["111111", "low"]]),
    });
    expect(ranked.map((r) => r.load.id)).toEqual([2, 1]);
    expect(excluded.map((e) => e.load.id)).toEqual([3]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  test("flags loads below the carrier's minimum rate", () => {
    const { ranked } = rankLoads([load({ rate_usd: 900 })], {
      vehicle: boxTruck,
      carrier,
      weights: DEFAULT_WEIGHTS,
      deadheadByLoad: new Map([[1, 0]]),
      riskByMc: new Map(),
    });
    expect(ranked[0].belowMinimum).toBe(true);
    expect(ranked[0].brokerRisk).toBe("unknown");
  });

  test("ranks 500 loads quickly (NFR-01: under 3 seconds)", () => {
    const many = Array.from({ length: 500 }, (_, i) => load({ id: i + 1, rate_usd: 1000 + i }));
    const started = performance.now();
    rankLoads(many, {
      vehicle: boxTruck,
      carrier,
      weights: DEFAULT_WEIGHTS,
      deadheadByLoad: new Map(),
      riskByMc: new Map(),
    });
    expect(performance.now() - started).toBeLessThan(3000);
  });
});

describe("Weight Lab helpers", () => {
  test("allWeightSets makes every set that adds to 100", () => {
    expect(allWeightSets(5)).toHaveLength(1771);
    expect(allWeightSets(1)).toHaveLength(176851);
    expect(allWeightSets(25).every((w) => w.rpm + w.deadhead + w.lane + w.broker === 100)).toBe(true);
  });

  test("agreement counts how often the booked load scores higher", () => {
    // Booked load is better on lanes, worse on rate
    const pairs = [
      { chosen: { rpm: 0.4, deadhead: 1, lane: 1, broker: 1 }, other: { rpm: 0.9, deadhead: 1, lane: 0, broker: 1 } },
    ];
    expect(agreement({ rpm: 100, deadhead: 0, lane: 0, broker: 0 }, pairs)).toBe(0);
    expect(agreement({ rpm: 0, deadhead: 0, lane: 100, broker: 0 }, pairs)).toBe(1);
    expect(agreement({ rpm: 0, deadhead: 100, lane: 0, broker: 0 }, pairs)).toBe(0.5); // tie
  });

  test("bestWeightSets returns the top sets, best first", () => {
    const pairs = [
      { chosen: { rpm: 0.4, deadhead: 1, lane: 1, broker: 1 }, other: { rpm: 0.9, deadhead: 1, lane: 0, broker: 1 } },
    ];
    const best = bestWeightSets(allWeightSets(10), pairs, 3);
    expect(best).toHaveLength(3);
    expect(best[0].agreement).toBe(1);
    expect(best[0].agreement).toBeGreaterThanOrEqual(best[2].agreement);
  });
});
