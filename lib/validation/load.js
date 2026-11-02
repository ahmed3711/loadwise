import { z } from "zod";
import { todayString } from "@/lib/format";
import {
  textField,
  cityField,
  stateField,
  equipmentField,
  mcField,
  wholeNumberField,
  decimalField,
  dateField,
} from "./common";

// The columns a CSV file must have (same names as the form fields)
export const LOAD_CSV_COLUMNS = [
  "origin_city",
  "origin_state",
  "destination_city",
  "destination_state",
  "pickup_date",
  "delivery_date",
  "loaded_miles",
  "weight_lbs",
  "pallet_count",
  "length_ft",
  "equipment_type",
  "rate_usd",
  "broker_name",
  "broker_mc",
];

// Rules for a load (used by the form AND by every row of the CSV upload).
// originalPickup: when editing an old load, its pickup date may already be
// in the past, so we allow it if it hasn't been changed.
export function makeLoadSchema(originalPickup = null) {
  const today = todayString();

  return z
    .object({
      origin_city: cityField("Origin city"),
      origin_state: stateField("Origin state"),
      destination_city: cityField("Destination city"),
      destination_state: stateField("Destination state"),
      pickup_date: dateField("Pickup date").refine(
        (value) => value >= today || value === originalPickup,
        "Pickup date can't be in the past"
      ),
      delivery_date: dateField("Delivery date"),
      loaded_miles: wholeNumberField("Loaded miles", 1, 5000),
      weight_lbs: wholeNumberField("Weight (lbs)", 1, 80000),
      pallet_count: wholeNumberField("Pallet count", 0, 30),
      length_ft: decimalField("Load length (ft)", { min: 0, max: 53, decimals: 1, minIsAllowed: false }),
      equipment_type: equipmentField("Equipment type"),
      rate_usd: decimalField("Rate (USD)", { min: 0, max: 100000, decimals: 2, minIsAllowed: false }),
      broker_name: textField("Broker name", 2, 100),
      broker_mc: mcField("Broker MC number"),
    })
    .refine((data) => data.delivery_date >= data.pickup_date, {
      message: "Delivery date must be on or after the pickup date",
      path: ["delivery_date"],
    });
}

export const emptyLoad = {
  origin_city: "",
  origin_state: "",
  destination_city: "",
  destination_state: "",
  pickup_date: "",
  delivery_date: "",
  loaded_miles: "",
  weight_lbs: "",
  pallet_count: "",
  length_ft: "",
  equipment_type: "",
  rate_usd: "",
  broker_name: "",
  broker_mc: "",
};

export function loadToForm(load) {
  return {
    origin_city: load.origin_city,
    origin_state: load.origin_state,
    destination_city: load.destination_city,
    destination_state: load.destination_state,
    pickup_date: load.pickup_date,
    delivery_date: load.delivery_date,
    loaded_miles: String(load.loaded_miles),
    weight_lbs: String(load.weight_lbs),
    pallet_count: String(load.pallet_count),
    length_ft: String(load.length_ft),
    equipment_type: load.equipment_type,
    rate_usd: String(load.rate_usd),
    broker_name: load.broker_name,
    broker_mc: load.broker_mc,
  };
}

// Cleans up one CSV row before checking it:
// trims spaces, makes states upper-case, turns "Dry Van" into "dry_van",
// and turns US dates like 11/20/2026 into 2026-11-20.
export function cleanCsvRow(row) {
  const clean = {};
  LOAD_CSV_COLUMNS.forEach((column) => {
    clean[column] = String(row[column] ?? "").trim();
  });

  clean.origin_state = clean.origin_state.toUpperCase();
  clean.destination_state = clean.destination_state.toUpperCase();
  clean.equipment_type = clean.equipment_type.toLowerCase().replace(/[\s-]+/g, "_");
  clean.pickup_date = toIsoDate(clean.pickup_date);
  clean.delivery_date = toIsoDate(clean.delivery_date);
  // Allow "$1,850" or "42,000" in number columns
  ["loaded_miles", "weight_lbs", "pallet_count", "rate_usd"].forEach((column) => {
    clean[column] = clean[column].replace(/[$,]/g, "");
  });
  return clean;
}

function toIsoDate(value) {
  const usDate = value.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);
  if (!usDate) return value;
  const [, month, day, year] = usDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
