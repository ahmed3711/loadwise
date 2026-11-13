import { NextResponse } from "next/server";
import { requireManager, jsonError, readJson, toId } from "@/lib/api-auth";
import { runWeightLab } from "@/lib/matching/weight-lab";

// Worker threads need the Node.js runtime (not the Edge runtime)
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/matching/weight-lab  { carrierId }
// Tests 176,851 weight sets against the carrier's booking history using
// several worker threads at once (multithreading).
export async function POST(request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;

  const carrierId = toId((await readJson(request)).carrierId);
  if (!carrierId) return jsonError("Choose a carrier first.");

  try {
    const result = await runWeightLab(auth.supabase, carrierId);
    if (!result) return jsonError("Carrier not found.", 404);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Weight Lab failed:", error);
    return jsonError(`The Weight Lab couldn't finish: ${error.message}`, 500);
  }
}
