import { z } from "zod";
import { STATE_CODES } from "@/lib/constants";
import {
  emailField,
  phoneField,
  textField,
  cityField,
  stateField,
  mcField,
  decimalField,
} from "./common";

// Rules for the carrier profile form (FR-01)
export const carrierSchema = z.object({
  company_name: textField("Company name", 2, 100),
  mc_number: mcField("MC number"),
  dot_number: z
    .string()
    .trim()
    .min(1, "USDOT number is required")
    .regex(/^[0-9]{5,8}$/, "USDOT number must be 5–8 digits (numbers only)"),
  contact_email: emailField,
  contact_phone: phoneField,
  home_city: cityField("Home city"),
  home_state: stateField("Home state"),
  zip_code: z
    .string()
    .trim()
    .min(1, "ZIP code is required")
    .regex(/^[0-9]{5}$/, "ZIP code must be exactly 5 digits"),
  // Checkbox list: always turn the value into a list (even if empty)
  preferred_states: z.preprocess(
    (value) => (Array.isArray(value) ? value : value ? [value] : []),
    z
      .array(z.string())
      .refine((list) => list.every((code) => STATE_CODES.includes(code)), "Choose states from the list only")
  ),
  min_rate_per_mile: decimalField("Minimum rate per mile", {
    min: 0,
    max: 20,
    decimals: 2,
    minIsAllowed: false,
  }),
});

// Empty form for "Add carrier"
export const emptyCarrier = {
  company_name: "",
  mc_number: "",
  dot_number: "",
  contact_email: "",
  contact_phone: "",
  home_city: "",
  home_state: "",
  zip_code: "",
  preferred_states: [],
  min_rate_per_mile: "",
};

// Turns a database row into form values (numbers become text for the inputs)
export function carrierToForm(carrier) {
  return {
    company_name: carrier.company_name,
    mc_number: carrier.mc_number,
    dot_number: carrier.dot_number,
    contact_email: carrier.contact_email,
    contact_phone: carrier.contact_phone,
    home_city: carrier.home_city,
    home_state: carrier.home_state,
    zip_code: carrier.zip_code,
    preferred_states: carrier.preferred_states ?? [],
    min_rate_per_mile: String(carrier.min_rate_per_mile),
  };
}
