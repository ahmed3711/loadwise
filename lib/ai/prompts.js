import { z } from "zod";
import { EQUIPMENT_VALUES } from "@/lib/constants";

// ---------------------------------------------------------------------
// 1. Reading a pasted load into the load form
// ---------------------------------------------------------------------

// What the AI must return. Unknown values are null; our own Zod rules in
// lib/validation/load.js still check every field before anything is saved.
export const parsedLoadSchema = z.object({
  origin_city: z.string().nullable(),
  origin_state: z.string().nullable().describe("2-letter US state code"),
  destination_city: z.string().nullable(),
  destination_state: z.string().nullable().describe("2-letter US state code"),
  pickup_date: z.string().nullable().describe("YYYY-MM-DD"),
  delivery_date: z.string().nullable().describe("YYYY-MM-DD"),
  loaded_miles: z.number().nullable(),
  weight_lbs: z.number().nullable(),
  pallet_count: z.number().nullable(),
  length_ft: z.number().nullable(),
  equipment_type: z.enum(EQUIPMENT_VALUES).nullable(),
  rate_usd: z.number().nullable().describe("Total pay for the load in US dollars"),
  broker_name: z.string().nullable(),
  broker_mc: z.string().nullable().describe("Digits only"),
  notes: z.array(z.string()).describe("Short notes about anything missing, unclear or guessed"),
});

export const PARSE_LOAD_SYSTEM = `You read freight load offers that a trucking dispatcher pasted from an email, a WhatsApp message or a load board, and turn them into form fields.

Rules:
- Only use information that is in the text. If a value is not there, return null. Never invent a broker, MC number, rate or date.
- States are 2-letter US codes (e.g. "Dallas, Texas" -> origin_city "Dallas", origin_state "TX").
- Dates are YYYY-MM-DD. Work out relative dates ("tomorrow", "Mon") from the date given in the message. If the year is missing, use the next upcoming date.
- equipment_type must be one of: cargo_van, box_truck, dry_van, reefer, flatbed. "53' van" or "van" means dry_van; "reefer"/"refrigerated" means reefer; "sprinter" means cargo_van; "straight truck" or "26' box" means box_truck.
- rate_usd is the total pay. If only a rate per mile and the miles are given, multiply them and say so in notes.
- broker_mc: digits only (remove "MC", "#" and spaces).
- If the load length isn't given, leave length_ft null. Don't guess weights or pallet counts.
- Put a short note for every field you had to guess or calculate, and for anything important that is missing.`;

export function parseLoadPrompt(text, today) {
  return `Today's date is ${today}.\n\nLoad text pasted by the dispatcher:\n"""\n${text}\n"""`;
}

// ---------------------------------------------------------------------
// 2. Explaining the top matches
// ---------------------------------------------------------------------

export const matchAdviceSchema = z.object({
  summary: z.string().describe("2-3 sentences for the dispatcher"),
  picks: z.array(
    z.object({
      load_id: z.number(),
      verdict: z.enum(["recommended", "consider", "avoid"]),
      reason: z.string().describe("One or two short sentences"),
    })
  ),
  cautions: z.array(z.string()).describe("Things the dispatcher should double-check before booking"),
});

export const MATCH_ADVICE_SYSTEM = `You are an assistant inside LoadWise, a dispatch system for small US trucking carriers. You help a dispatcher decide between loads that the system has ALREADY checked and scored.

Important rules:
- Every load you receive already fits the vehicle. The numbers (empty miles, net rate per mile, score 0-100, broker risk) were calculated by the system. Do not recalculate or change them, and do not invent new numbers.
- Base your advice only on the data given: net rate per mile vs the carrier's minimum, empty miles, whether the lane is in the carrier's preferred/home states (driver home time), pickup date, and broker risk.
- A broker marked "high" or "unknown" risk must always get a caution telling the dispatcher to verify the broker before booking. Never call such a load "recommended" without that caution.
- The dispatcher makes the final decision. Be short, practical and plain-spoken. Use US dollars and miles.
- Give one pick for every load you receive, using its load_id.`;

export function matchAdvicePrompt({ carrier, vehicle, from, weights, ranked }) {
  const lines = ranked.map((item, index) => {
    const l = item.load;
    return [
      `#${index + 1} load_id=${l.id}`,
      `lane: ${l.origin_city}, ${l.origin_state} -> ${l.destination_city}, ${l.destination_state}`,
      `pickup ${l.pickup_date}, delivery ${l.delivery_date}`,
      `rate $${Number(l.rate_usd).toFixed(2)} for ${l.loaded_miles} loaded miles`,
      `empty miles to pickup: ${item.deadheadMiles}`,
      `net rate per mile: $${item.netRpm.toFixed(2)}${item.belowMinimum ? " (BELOW carrier minimum)" : ""}`,
      `score: ${item.score}/100`,
      `broker: ${l.broker_name} (MC ${l.broker_mc}), risk: ${item.brokerRisk}`,
    ].join("; ");
  });

  return [
    `Carrier: ${carrier.company_name}, home base ${carrier.home_city}, ${carrier.home_state}.`,
    `Preferred states: ${(carrier.preferred_states ?? []).join(", ") || "none set"}.`,
    `Minimum rate per mile: $${Number(carrier.min_rate_per_mile).toFixed(2)}.`,
    `Vehicle: ${vehicle.equipment_type.replace("_", " ")}, now at ${from.city}, ${from.state}.`,
    `Score weights: net RPM ${weights.rpm}%, low empty miles ${weights.deadhead}%, preferred lanes ${weights.lane}%, broker trust ${weights.broker}%.`,
    "",
    "Top-ranked loads (best first):",
    ...lines,
  ].join("\n");
}
