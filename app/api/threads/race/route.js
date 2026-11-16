import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRaceDemo } from "@/lib/threads/jobs.mjs";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/threads/race: the race condition demo (no database data used)
export async function POST() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  try {
    return NextResponse.json(await runRaceDemo());
  } catch (threadError) {
    return NextResponse.json({ error: `Worker threads failed: ${threadError.message}` }, { status: 500 });
  }
}
