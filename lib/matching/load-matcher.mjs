// =====================================================================
// LoadMatcher: ranks the available loads for one vehicle.
//
//   1. every load goes down the fit chain (fit-checks.mjs, Chain of
//      Responsibility); loads that fail are "left out" with the reasons
//   2. empty miles, net rate per mile and the three part scores
//   3. score with the weights of the chosen ranking mode and sort
//
// Steps 1 and 2 only depend on the vehicle, the truck location and the
// fuel cost, so changing the ranking mode only repeats step 3.
// =====================================================================
import { checkFit } from "./fit-checks.mjs";
import { evaluateLoad, weightedScore, DEFAULT_FUEL_COST } from "./scoring.mjs";
import { estimateRoadMiles } from "./us-places.mjs";
import { getMode } from "./ranking-modes.mjs";

export class LoadMatcher {
  // vehicle and carrier are rows from the database.
  // from = where the truck is now ({ city, state }), default = home base.
  constructor({ vehicle, carrier, from, fuelCostPerMile = DEFAULT_FUEL_COST }) {
    this.vehicle = vehicle;
    this.carrier = carrier;
    this.from = from?.city && from?.state ? from : { city: carrier.home_city, state: carrier.home_state };
    this.fuelCostPerMile = Number(fuelCostPerMile) >= 0 ? Number(fuelCostPerMile) : DEFAULT_FUEL_COST;
  }

  // Steps 1 + 2: split the loads into "fits" (with all numbers) and "left out"
  evaluate(loads) {
    const fitting = [];
    const excluded = [];

    for (const load of loads) {
      const fit = checkFit(load, this.vehicle);
      if (!fit.fits) {
        excluded.push({ load, reasons: fit.reasons });
        continue;
      }
      const deadheadMiles = estimateRoadMiles(this.from, { city: load.origin_city, state: load.origin_state });
      fitting.push(
        evaluateLoad(load, { carrier: this.carrier, deadheadMiles, fuelCostPerMile: this.fuelCostPerMile })
      );
    }

    return { fitting, excluded };
  }

  // Step 3: score with the mode's weights and sort, best first.
  // Ties go to the higher net rate per mile, then the earlier pickup.
  rank(fitting, weights = getMode().weights) {
    return fitting
      .map((item) => ({ ...item, score: weightedScore(item.parts, weights) }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.netRpm - a.netRpm ||
          String(a.load.pickup_date).localeCompare(String(b.load.pickup_date))
      );
  }

  // Everything together
  match(loads, weights) {
    const { fitting, excluded } = this.evaluate(loads);
    return { ranked: this.rank(fitting, weights), excluded };
  }
}
