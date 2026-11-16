import { z } from "zod";
import { STATE_CODES } from "@/lib/constants";
import { RANKING_MODES } from "@/lib/matching/ranking-modes.mjs";

// What the Matching page sends to the Stability Check API
export const stabilityRequestSchema = z.object({
  vehicleId: z.coerce.number().int().positive("Choose a vehicle"),
  city: z
    .string()
    .trim()
    .regex(/^[A-Za-z .'-]{2,50}$/, "City: letters only, 2-50 characters"),
  state: z.enum(STATE_CODES, { error: "Choose a state" }),
  fuelCost: z.coerce.number().min(0, "Fuel cost can't be negative").max(5, "Fuel cost: at most $5 per mile"),
  modeId: z.enum(RANKING_MODES.map((mode) => mode.id)),
});
