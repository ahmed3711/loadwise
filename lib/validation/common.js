import { z } from "zod";
import { STATE_CODES, EQUIPMENT_VALUES } from "@/lib/constants";

// Reusable validation rules. Every form (and the CSV upload) builds its
// rules from these, so the same field is always checked the same way.
// The patterns match the CHECK constraints in supabase/schema.sql.

// Same email pattern as the database
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .regex(EMAIL_REGEX, "Enter a valid email address, like name@example.com");

export const phoneField = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits (numbers only), like 5551234567");

export const fullNameField = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .regex(/^[A-Za-z ]{2,50}$/, "Name must be 2–50 letters and spaces only");

// Required text with a minimum and maximum length
export function textField(label, min, max) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

// City names: letters, spaces, dots, apostrophes and hyphens (e.g. St. Louis)
export function cityField(label) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(/^[A-Za-z .'-]{2,50}$/, `${label} must be 2–50 letters (spaces . ' - allowed)`);
}

// 2-letter US state code chosen from the list
export function stateField(label) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => STATE_CODES.includes(value), `${label} must be a valid 2-letter US state code`);
}

export function equipmentField(label = "Equipment type") {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => EQUIPMENT_VALUES.includes(value), `Choose a valid ${label.toLowerCase()}`);
}

// MC number: 6–8 digits
export function mcField(label = "MC number") {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(/^[0-9]{6,8}$/, `${label} must be 6–8 digits (numbers only)`);
}

// Whole number in a range, e.g. weight 1–80,000. Turns "42000" into 42000.
export function wholeNumberField(label, min, max) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(/^[0-9]+$/, `${label} must be a whole number (no decimals or symbols)`)
    .refine(
      (value) => Number(value) >= min && Number(value) <= max,
      `${label} must be between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")}`
    )
    .transform((value) => Number(value));
}

// Positive decimal number with a limited number of decimal places.
// minIsAllowed = false means the number must be GREATER than min (e.g. rate > 0).
export function decimalField(label, { min, max, decimals = 2, minIsAllowed = true }) {
  const pattern = new RegExp(`^[0-9]+(\\.[0-9]{1,${decimals}})?$`);
  const decimalWord = decimals === 1 ? "1 decimal place" : `${decimals} decimal places`;
  const rangeMessage = minIsAllowed
    ? `${label} must be between ${min} and ${max}`
    : `${label} must be greater than ${min} and at most ${max.toLocaleString("en-US")}`;

  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(pattern, `${label} must be a positive number with at most ${decimalWord}`)
    .refine((value) => {
      const number = Number(value);
      const aboveMin = minIsAllowed ? number >= min : number > min;
      return aboveMin && number <= max;
    }, rangeMessage)
    .transform((value) => Number(value));
}

// Checks that "YYYY-MM-DD" is a real calendar date (e.g. not 2026-02-30)
export function isRealDate(value) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateField(label) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(isRealDate, `${label} must be a real date in the format YYYY-MM-DD`);
}
