import { netRatePerMile, partScores, evaluateLoad, weightedScore } from "../lib/matching/scoring.mjs";
import { estimateRoadMiles } from "../lib/matching/us-places.mjs";
import { LoadMatcher } from "../lib/matching/load-matcher.mjs";
import { RANKING_MODES, getMode, explainScore } from "../lib/matching/ranking-modes.mjs";
import {
  FitCheck,
  EquipmentCheck,
  WeightCheck,
  buildFitChain,
  chainNames,
  checkFit,
} from "../lib/matching/fit-checks.mjs";

const boxTruck = { equipment_type: "box_truck", length_ft: 26, max_payload_lbs: 10000, max_pallets: 12 };
const reefer = { equipment_type: "reefer", length_ft: 53, max_payload_lbs: 43000, max_pallets: 26 };
const carrier = {
  home_city: "Dallas",
  home_state: "TX",
  preferred_states: ["TX", "OK"],
  min_rate_per_mile: 2,
};

function load(overrides = {}) {
  return {
    id: 1,
    origin_city: "Dallas",
    origin_state: "TX",
    destination_city: "Houston",
    destination_state: "TX",
    pickup_date: "2026-12-01",
    loaded_miles: 240,
    weight_lbs: 7000,
    pallet_count: 8,
    length_ft: 18,
    equipment_type: "box_truck",
    rate_usd: 620,
    broker_name: "Test Broker",
    ...overrides,
  };
}

describe("Design pattern 1: Chain of Responsibility (fit filter, FR-05)", () => {
  test("FitCheck is abstract and the chain has 4 handlers in order", () => {
    expect(() => new FitCheck("x")).toThrow(/abstract/);
    expect(chainNames()).toEqual(["Equipment", "Weight", "Pallets", "Length"]);
    expect(buildFitChain()).toBeInstanceOf(EquipmentCheck);
  });

  test("every handler passes the load on, so all reasons are collected", () => {
    // Fails equipment AND weight: both handlers must report
    const reasons = buildFitChain().handle(load({ equipment_type: "flatbed", weight_lbs: 20000 }), boxTruck, []);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toMatch(/flatbed/);
    expect(reasons[1]).toMatch(/Weight/);
  });

  test("a new rule is just a new handler added to the chain", () => {
    class NoWeekendCheck extends FitCheck {
      constructor() {
        super("No weekend");
      }
      check(item) {
        return item.pickup_date === "2026-12-05" ? "Weekend pickup" : null;
      }
    }
    const chain = new WeightCheck();
    chain.setNext(new NoWeekendCheck());
    expect(chainNames(chain)).toEqual(["Weight", "No weekend"]);
    expect(checkFit(load({ pickup_date: "2026-12-05" }), boxTruck, chain).reasons).toEqual(["Weekend pickup"]);
  });

  test("a load within every limit fits", () => {
    expect(checkFit(load(), boxTruck)).toEqual({ fits: true, reasons: [] });
  });

  test("too heavy, too many pallets and too long are all reported", () => {
    const result = checkFit(load({ weight_lbs: 14000, pallet_count: 14, length_ft: 30 }), boxTruck);
    expect(result.fits).toBe(false);
    expect(result.reasons).toHaveLength(3);
  });

  test("wrong equipment is left out, but a reefer can carry dry-van freight", () => {
    expect(checkFit(load({ equipment_type: "flatbed" }), boxTruck).fits).toBe(false);
    expect(checkFit(load({ equipment_type: "dry_van", weight_lbs: 30000 }), reefer).fits).toBe(true);
  });
});

describe("Empty miles and net rate per mile (FR-06, FR-07)", () => {
  test("same city = 0 empty miles; Dallas -> Houston is about 270 road miles", () => {
    expect(estimateRoadMiles({ city: "Dallas", state: "TX" }, { city: "dallas", state: "TX" })).toBe(0);
    const miles = estimateRoadMiles({ city: "Dallas", state: "TX" }, { city: "Houston", state: "TX" });
    expect(miles).toBeGreaterThan(250);
    expect(miles).toBeLessThan(300);
  });

  test("net RPM = (rate - empty miles x fuel) / (loaded + empty miles)", () => {
    // (1000 - 100 x 0.5) / (400 + 100) = 1.90
    expect(netRatePerMile({ rate: 1000, loadedMiles: 400, deadheadMiles: 100, fuelCostPerMile: 0.5 })).toBe(1.9);
  });

  test("part scores are each between 0 and 1", () => {
    const parts = partScores({
      netRpm: 3,
      minRatePerMile: 2,
      loadedMiles: 300,
      deadheadMiles: 0,
      originState: "TX",
      destinationState: "GA",
      homeState: "TX",
      preferredStates: ["OK"],
    });
    expect(parts).toEqual({ rpm: 1, deadhead: 1, lane: 0.5 });
  });

  test("a load below the carrier's minimum is flagged", () => {
    const item = evaluateLoad(load({ rate_usd: 300 }), { carrier, deadheadMiles: 0 });
    expect(item.belowMinimum).toBe(true);
  });
});

describe("Ranking modes and LoadMatcher", () => {
  test("every mode's weights add up to 100; unknown id falls back to Balanced", () => {
    for (const mode of RANKING_MODES) {
      expect(Object.values(mode.weights).reduce((a, b) => a + b, 0)).toBe(100);
    }
    expect(getMode("nope").id).toBe("balanced");
  });

  test("the explanation adds up to the score", () => {
    const { weights } = getMode("balanced");
    const parts = { rpm: 0.8, deadhead: 0.5, lane: 1 };
    const total = explainScore(parts, weights).reduce((sum, row) => sum + row.points, 0);
    expect(Math.round(total)).toBe(weightedScore(parts, weights));
  });

  test("switching ranking mode changes which load is #1 (same matcher, same loads)", () => {
    // Far away but very well paid vs. right here but cheaper
    const farAndRich = load({ id: 1, origin_city: "Oklahoma City", origin_state: "OK", rate_usd: 1500 });
    const closeAndCheap = load({ id: 2, rate_usd: 560 });
    const matcher = new LoadMatcher({ vehicle: boxTruck, carrier });

    expect(matcher.match([farAndRich, closeAndCheap], getMode("max-profit").weights).ranked[0].load.id).toBe(1);
    expect(matcher.match([farAndRich, closeAndCheap], getMode("least-empty").weights).ranked[0].load.id).toBe(2);
  });

  test("the matcher puts loads that don't fit in 'excluded'", () => {
    const matcher = new LoadMatcher({ vehicle: boxTruck, carrier });
    const { ranked, excluded } = matcher.match([load({ id: 1 }), load({ id: 2, weight_lbs: 20000 })]);
    expect(ranked.map((item) => item.load.id)).toEqual([1]);
    expect(excluded[0].load.id).toBe(2);
  });

  test("without a location the truck starts at the carrier's home base", () => {
    const matcher = new LoadMatcher({ vehicle: boxTruck, carrier, from: { city: "", state: "" } });
    expect(matcher.from).toEqual({ city: "Dallas", state: "TX" });
  });
});
