import { z } from "zod";
import { emailField, fullNameField, phoneField } from "./common";
import { ROLE_VALUES } from "@/lib/constants";

// Used for the live password checklist on the sign-up page
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "1 uppercase letter (A–Z)", test: (value) => /[A-Z]/.test(value) },
  { label: "1 lowercase letter (a–z)", test: (value) => /[a-z]/.test(value) },
  { label: "1 number (0–9)", test: (value) => /[0-9]/.test(value) },
  { label: "1 special character (! @ # $ …)", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const passwordField = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[A-Z]/, "Add at least 1 uppercase letter")
  .regex(/[a-z]/, "Add at least 1 lowercase letter")
  .regex(/[0-9]/, "Add at least 1 number")
  .regex(/[^A-Za-z0-9]/, "Add at least 1 special character (like ! @ # $)");

export const signupSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
        confirmEmail: z.string().trim().min(1, "Please confirm your email"),
    age: z
      .string()
      .trim()
      .min(1, "Age is required")
      .regex(/^[0-9]+$/, "Age must be a whole number (numbers only)")
      .refine((value) => Number(value) >= 18 && Number(value) <= 75, "Age must be between 18 and 75"),
    phone: phoneField,
    role: z
      .string()
      .min(1, "Please choose a role")
      .refine((value) => ROLE_VALUES.includes(value), "Please choose a role from the list"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
    // Rule that compares two fields: emails must match (capital letters don't matter)
  .refine((data) => data.email.toLowerCase() === data.confirmEmail.toLowerCase(), {
    message: "Emails do not match",
    path: ["confirmEmail"],
  })
  // Rule that compares two fields: passwords must match
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  // Rule that compares two fields: drivers must be 21+
  .refine((data) => data.role !== "driver" || Number(data.age) >= 21, {
    message: "Drivers must be at least 21 years old",
    path: ["age"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

// Turns Supabase's technical login/sign-up errors into friendly ones
export function friendlyAuthError(message) {
  if (message.includes("Invalid login credentials")) {
    return "Wrong email or password. Please try again.";
  }
  if (message.includes("already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (message.includes("Database error saving new user")) {
    return "We couldn't save your profile. Please check your details and try again.";
  }
  return message;
}
