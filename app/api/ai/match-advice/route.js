import { NextResponse } from "next/server";
import { requireManager, jsonError, readJson, toId } from "@/lib/api-auth";
import { askForJson, AiError } from "@/lib/ai/claude";
import { matchAdviceSchema, MATCH_ADVICE_SYSTEM, matchAdvicePrompt } from "@/lib/ai/prompts";
import { rankForVehicle } from "@/lib/matching/engine";

const TOP_N = 5;

// POST /api/ai/match-advice  { vehicleId }
// Ranks the loads again on the server, then asks the AI to explain the
// top 5 in plain English. Loads that don't fit are never sent to the AI.
export async function POST(request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;

  const vehicleId = toId((await readJson(request)).vehicleId);
  if (!vehicleId) return jsonError("Choose a vehicle first.");

  const ranking = await rankForVehicle(auth.supabase, vehicleId);
  if (!ranking) return jsonError("Vehicle not found.", 404);

  const top = ranking.ranked.slice(0, TOP_N);
  if (top.length === 0) return jsonError("There are no matching loads to review.", 422);

  try {
    const advice = await askForJson({
      system: MATCH_ADVICE_SYSTEM,
      prompt: matchAdvicePrompt({ ...ranking, ranked: top }),
      schema: matchAdviceSchema,
      effort: "medium",
    });

    // Keep only picks for loads we actually sent
    const sentIds = new Set(top.map((item) => item.load.id));
    advice.picks = advice.picks.filter((pick) => sentIds.has(pick.load_id));
    return NextResponse.json(advice);
  } catch (error) {
    if (error instanceof AiError) return jsonError(error.message, error.status);
    console.error("AI match-advice failed:", error);
    return jsonError("Something went wrong while asking the AI.", 500);
  }
}
