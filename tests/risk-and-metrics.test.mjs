// Unit tests for broker risk (FR-11), distance estimates (FR-06)
// and the weekly dashboard numbers (FR-16)
import { brokerRisk, isStale, monthsBetween } from "../lib/brokers/risk.mjs";
import { estimateRoadMiles, placeKey } from "../lib/matching/us-places.mjs";
import { totalsOf, weeklyCarrierMetrics } from "../lib/metrics.mjs";

const today = new Date(2026, 10, 13); // 13 Nov 2026

describe("brokerRisk (FR-11)", () => {
  test("never checked = not verified", () => {
    expect(brokerRisk(null, today)).toBe("unknown");
  });

  test("inactive or not found = high risk", () => {
    expect(brokerRisk({ authority_status: "inactive", authority_granted_on: "2015-01-01" }, today)).toBe("high");
    expect(brokerRisk({ authority_status: "not_found" }, today)).toBe("high");
  });

  test("active but less than 12 months old = high risk", () => {
    expect(brokerRisk({ authority_status: "active", authority_granted_on: "2026-03-01" }, today)).toBe("high");
  });

  test("active for 12 months or more = low risk", () => {
    expect(brokerRisk({ authority_status: "active", authority_granted_on: "2025-11-13" }, today)).toBe("low");
    expect(brokerRisk({ authority_status: "active", authority_granted_on: "2018-06-01" }, today)).toBe("low");
  });

  test("active with unknown start date = not verified", () => {
    expect(brokerRisk({ authority_status: "active", authority_granted_on: null }, today)).toBe("unknown");
  });

  test("monthsBetween counts whole months", () => {
    expect(monthsBetween("2025-11-14", today)).toBe(11);
    expect(monthsBetween("2025-11-13", today)).toBe(12);
  });

  test("FMCSA results older than 24 hours are stale (NFR-04)", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(isStale("2026-11-13T00:00:00Z", now)).toBe(false);
    expect(isStale("2026-11-12T11:00:00Z", now)).toBe(true);
  });
});

describe("distance estimate (fallback for FR-06)", () => {
  test("same city = 0 empty miles", () => {
    expect(estimateRoadMiles({ city: "Dallas", state: "TX" }, { city: "dallas", state: "tx" })).toBe(0);
  });

  test("Dallas to Houston is roughly the real ~240 road miles", () => {
    const miles = estimateRoadMiles({ city: "Dallas", state: "TX" }, { city: "Houston", state: "TX" });
    expect(miles).toBeGreaterThan(200);
    expect(miles).toBeLessThan(300);
  });

  test("'St. Louis' and 'Saint Louis' are the same place", () => {
    expect(placeKey("St. Louis", "MO")).toBe(placeKey("Saint Louis", "mo"));
  });

  test("unknown cities fall back to the state centre", () => {
    const miles = estimateRoadMiles({ city: "Smallville", state: "KS" }, { city: "Wichita", state: "KS" });
    expect(miles).toBeGreaterThan(0);
  });
});

describe("weeklyCarrierMetrics (FR-16)", () => {
  const bookings = [
    { carrier_id: 1, carrier_name: "A", rate_usd: 2000, loaded_miles: 800, deadhead_miles: 200, net_rpm: 1.9, pickup_date: "2026-11-10" },
    { carrier_id: 1, carrier_name: "A", rate_usd: 1000, loaded_miles: 400, deadhead_miles: 0, net_rpm: 2.5, pickup_date: "2026-11-12" },
    { carrier_id: 2, carrier_name: "B", rate_usd: 500, loaded_miles: 200, deadhead_miles: 50, net_rpm: 1.9, pickup_date: "2026-11-11" },
    { carrier_id: 1, carrier_name: "A", rate_usd: 9999, loaded_miles: 1, deadhead_miles: 1, net_rpm: 9, pickup_date: "2026-11-20" }, // other week
  ];

  test("sums revenue per carrier for the week only", () => {
    const rows = weeklyCarrierMetrics(bookings, "2026-11-09", "2026-11-15");
    expect(rows.map((r) => [r.carrierName, r.loads, r.grossRevenue])).toEqual([
      ["A", 2, 3000],
      ["B", 1, 500],
    ]);
  });

  test("empty-mile % and mile-weighted average net rate per mile", () => {
    const [a] = weeklyCarrierMetrics(bookings, "2026-11-09", "2026-11-15");
    expect(a.emptyShare).toBeCloseTo(200 / 1400);
    // (1.9 * 1000 + 2.5 * 400) / 1400 = 2.07
    expect(a.avgNetRpm).toBe(2.07);
  });

  test("totals across carriers", () => {
    const totals = totalsOf(weeklyCarrierMetrics(bookings, "2026-11-09", "2026-11-15"));
    expect(totals.loads).toBe(3);
    expect(totals.grossRevenue).toBe(3500);
  });
});
