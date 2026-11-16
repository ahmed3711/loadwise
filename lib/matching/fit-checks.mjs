// =====================================================================
// DESIGN PATTERN 1: CHAIN OF RESPONSIBILITY
// The hard fit filter (FR-05)
//
// A load must pass four checks before it can be ranked for a vehicle:
// equipment, weight, pallets and length. Each check is its own small
// class (a "handler"). The handlers are linked in a chain, and the load
// is passed from one handler to the next:
//
//   EquipmentCheck -> WeightCheck -> PalletCheck -> LengthCheck
//
// Each handler checks ONE rule, writes down a reason if the load fails,
// and passes the load on, so the dispatcher sees every reason at once.
// No handler knows the others, so a new rule (for example hazmat) is one
// new class added to the chain in buildFitChain(), without changing the
// existing checks (open for extension, closed for modification).
//
// This file has no imports, so the browser, the server and the Jest
// tests all run the same code.
// =====================================================================

// Which vehicle types can carry a load posted for each equipment type.
// A reefer (refrigerated van) can also carry normal dry-van freight.
export const CAN_CARRY = {
  cargo_van: ["cargo_van"],
  box_truck: ["box_truck"],
  dry_van: ["dry_van", "reefer"],
  reefer: ["reefer"],
  flatbed: ["flatbed"],
};

// The common handler every check extends (an "abstract" class)
export class FitCheck {
  constructor(name) {
    if (new.target === FitCheck) {
      throw new Error("FitCheck is abstract: use one of the checks below");
    }
    this.name = name;
    this.next = null;
  }

  // Links the next handler. Returns it, so a chain can be written as
  // first.setNext(second).setNext(third)
  setNext(check) {
    this.next = check;
    return check;
  }

  // Checks this rule, then hands the load to the next handler.
  // Returns the list of reasons the load does not fit (empty = it fits).
  handle(load, vehicle, reasons = []) {
    const problem = this.check(load, vehicle);
    if (problem) reasons.push(problem);
    return this.next ? this.next.handle(load, vehicle, reasons) : reasons;
  }

  // Each concrete check returns a reason, or null when the load is fine
  check() {
    throw new Error(`${this.name}: check() is missing`);
  }
}

// ---------------------------------------------------------------------
// The concrete checks (handlers)
// ---------------------------------------------------------------------
export class EquipmentCheck extends FitCheck {
  constructor() {
    super("Equipment");
  }
  check(load, vehicle) {
    const allowed = CAN_CARRY[load.equipment_type] ?? [load.equipment_type];
    return allowed.includes(vehicle.equipment_type)
      ? null
      : `Needs ${label(load.equipment_type)}, vehicle is ${label(vehicle.equipment_type)}`;
  }
}

export class WeightCheck extends FitCheck {
  constructor() {
    super("Weight");
  }
  check(load, vehicle) {
    return Number(load.weight_lbs) > Number(vehicle.max_payload_lbs)
      ? `Weight ${num(load.weight_lbs)} lbs > payload ${num(vehicle.max_payload_lbs)} lbs`
      : null;
  }
}

export class PalletCheck extends FitCheck {
  constructor() {
    super("Pallets");
  }
  check(load, vehicle) {
    return Number(load.pallet_count) > Number(vehicle.max_pallets)
      ? `${load.pallet_count} pallets > ${vehicle.max_pallets} pallet spaces`
      : null;
  }
}

export class LengthCheck extends FitCheck {
  constructor() {
    super("Length");
  }
  check(load, vehicle) {
    return Number(load.length_ft) > Number(vehicle.length_ft)
      ? `Length ${load.length_ft} ft > ${vehicle.length_ft} ft interior`
      : null;
  }
}

// ---------------------------------------------------------------------
// Building and using the chain
// ---------------------------------------------------------------------
export function buildFitChain() {
  const first = new EquipmentCheck();
  first.setNext(new WeightCheck()).setNext(new PalletCheck()).setNext(new LengthCheck());
  return first;
}

const FIT_CHAIN = buildFitChain();

// Names of the handlers in chain order (shown on the Matching page)
export function chainNames(chain = FIT_CHAIN) {
  const names = [];
  for (let check = chain; check; check = check.next) names.push(check.name);
  return names;
}

// Sends one load down the chain. Returns { fits, reasons }.
export function checkFit(load, vehicle, chain = FIT_CHAIN) {
  const reasons = chain.handle(load, vehicle, []);
  return { fits: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------
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

function num(value) {
  return Number(value).toLocaleString("en-US");
}
