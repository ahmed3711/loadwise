import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMatchableLoads } from "@/lib/matching/data";
import { LoadMatcher } from "@/lib/matching/load-matcher.mjs";
import { getMode } from "@/lib/matching/ranking-modes.mjs";
import { stabilityRequestSchema } from "@/lib/validation/matching";
import { runStabilityCheck } from "@/lib/threads/jobs.mjs";

// worker_threads need the Node.js runtime
export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/matching/stability
// Re-ranks the loads on the server (so the browser can't send fake
// numbers) and then runs the multithreaded Stability Check.
export async function POST(request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const parsed = stabilityRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { vehicleId, city, state, fuelCost, modeId } = parsed.data;

  const { data: vehicle } = await supabase.from("vehicles").select("*, carriers(*)").eq("id", vehicleId).maybeSingle();
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  const { data: loads, error } = await getMatchableLoads(supabase);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matcher = new LoadMatcher({
    vehicle,
    carrier: vehicle.carriers,
    from: { city, state },
    fuelCostPerMile: fuelCost,
  });
  const { ranked } = matcher.match(loads, getMode(modeId).weights);

  if (ranked.length < 2) {
    return NextResponse.json({ error: "At least 2 loads must fit this vehicle to compare them." }, { status: 400 });
  }

  try {
    const result = await runStabilityCheck(ranked.map((item) => item.parts));
    return NextResponse.json({
      ...result,
      loadIds: ranked.map((item) => item.load.id), // same order as result.wins
    });
  } catch (threadError) {
    return NextResponse.json({ error: `Worker threads failed: ${threadError.message}` }, { status: 500 });
  }
}
