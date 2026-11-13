import { NextResponse } from "next/server";
import { requireManager, jsonError, readJson } from "@/lib/api-auth";
import { askForJson, AiError } from "@/lib/ai/claude";
import { parsedLoadSchema, PARSE_LOAD_SYSTEM, parseLoadPrompt } from "@/lib/ai/prompts";
import { todayString } from "@/lib/format";

const MAX_LENGTH = 4000;

// POST /api/ai/parse-load  { text }
// Reads a pasted load offer and returns the form fields it found.
export async function POST(request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;

  const { text } = await readJson(request);
  const clean = String(text ?? "").trim();
  if (clean.length < 20) return jsonError("Paste the load details first (at least a few words).");
  if (clean.length > MAX_LENGTH) return jsonError(`Please paste at most ${MAX_LENGTH} characters (one load at a time).`);

  try {
    const result = await askForJson({
      system: PARSE_LOAD_SYSTEM,
      prompt: parseLoadPrompt(clean, todayString()),
      schema: parsedLoadSchema,
      effort: "low",
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AiError) return jsonError(error.message, error.status);
    console.error("AI parse-load failed:", error);
    return jsonError("Something went wrong while reading the load.", 500);
  }
}
