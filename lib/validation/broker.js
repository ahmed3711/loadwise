import { z } from "zod";
import { todayString } from "@/lib/format";
import { isRealDate } from "./common";

// Rules for recording a broker check by hand (matches the brokers table)
export const manualBrokerSchema = z.object({
  legal_name: z
    .string()
    .trim()
    .max(200, "Name must be 200 characters or fewer")
    .transform((value) => value || null),
  authority_status: z
    .string()
    .min(1, "Choose the authority status")
    .refine((value) => ["active", "inactive", "not_found"].includes(value), "Choose a status from the list"),
  authority_granted_on: z
    .string()
    .trim()
    .refine((value) => value === "" || isRealDate(value), "Enter a real date")
    .refine((value) => value === "" || value <= todayString(), "The date can't be in the future")
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(300, "Notes must be 300 characters or fewer")
    .transform((value) => value || null),
});

export function brokerToForm(broker) {
  return {
    legal_name: broker?.legal_name ?? "",
    authority_status: broker?.authority_status ?? "",
    authority_granted_on: broker?.authority_granted_on ?? "",
    notes: broker?.notes ?? "",
  };
}
