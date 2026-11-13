import { z } from "zod";
import { STATE_CODES } from "@/lib/constants";
import { equipmentField, decimalField, wholeNumberField } from "./common";

// Optional text: "" becomes null so the database stores "no value"
const optionalCity = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[A-Za-z .'-]{2,50}$/.test(value), "City must be 2–50 letters (spaces . ' - allowed)")
  .transform((value) => value || null);

const optionalState = z
  .string()
  .trim()
  .refine((value) => value === "" || STATE_CODES.includes(value), "Choose a state from the list")
  .transform((value) => value || null);

// Rules for the vehicle form
export const vehicleSchema = z.object({
  carrier_id: z
    .string()
    .min(1, "Choose the carrier that owns this vehicle")
    .regex(/^[0-9]+$/, "Choose a carrier from the list")
    .transform((value) => Number(value)),
  equipment_type: equipmentField("Equipment type"),
  length_ft: decimalField("Interior length (ft)", { min: 5, max: 53, decimals: 1 }),
  width_in: decimalField("Interior width (in)", { min: 40, max: 102, decimals: 1 }),
  height_in: decimalField("Interior height (in)", { min: 36, max: 162, decimals: 1 }),
  max_payload_lbs: wholeNumberField("Max payload (lbs)", 1, 80000),
  max_pallets: wholeNumberField("Max pallets", 0, 30),
  plate_number: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Plate number is required")
    .regex(/^[A-Z0-9]{2,8}$/, "Plate must be 2–8 letters or numbers (no spaces or symbols)"),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "VIN is required")
    .length(17, "VIN must be exactly 17 characters")
    .regex(/^[A-HJ-NPR-Z0-9]+$/, "VIN can only use letters and numbers, and never I, O or Q"),
  // Final milestone: used by the matching engine (FR-06, FR-07) and driver view (FR-15)
  current_city: optionalCity,
  current_state: optionalState,
  fuel_cost_per_mile: decimalField("Fuel cost per mile", { min: 0, max: 5, decimals: 2, minIsAllowed: false }),
  driver_id: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9a-f-]{36}$/i.test(value), "Choose a driver from the list")
    .transform((value) => value || null),
})
  // Rule that compares two fields: give both city and state, or neither
  .refine((data) => (data.current_city === null) === (data.current_state === null), {
    message: "Give both the current city and state, or leave both empty",
    path: ["current_state"],
  });

export const emptyVehicle = {
  carrier_id: "",
  equipment_type: "",
  length_ft: "",
  width_in: "",
  height_in: "",
  max_payload_lbs: "",
  max_pallets: "",
  plate_number: "",
  vin: "",
  current_city: "",
  current_state: "",
  fuel_cost_per_mile: "",
  driver_id: "",
};

export function vehicleToForm(vehicle) {
  return {
    carrier_id: String(vehicle.carrier_id),
    equipment_type: vehicle.equipment_type,
    length_ft: String(vehicle.length_ft),
    width_in: String(vehicle.width_in),
    height_in: String(vehicle.height_in),
    max_payload_lbs: String(vehicle.max_payload_lbs),
    max_pallets: String(vehicle.max_pallets),
    plate_number: vehicle.plate_number,
    vin: vehicle.vin,
    current_city: vehicle.current_city ?? "",
    current_state: vehicle.current_state ?? "",
    fuel_cost_per_mile: vehicle.fuel_cost_per_mile == null ? "" : String(vehicle.fuel_cost_per_mile),
    driver_id: vehicle.driver_id ?? "",
  };
}
