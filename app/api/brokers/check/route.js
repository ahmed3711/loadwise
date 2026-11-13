import { NextResponse } from "next/server";
import { requireManager, jsonError, readJson } from "@/lib/api-auth";
import { fmcsaConfigured, lookupBrokerByMc } from "@/lib/brokers/fmcsa";
import { isStale } from "@/lib/brokers/risk.mjs";
import { friendlyDbError } from "@/lib/db-errors";

// POST /api/brokers/check  { mc, refresh }
// Broker risk check by MC number (FR-10, FR-11, NFR-04):
//  1. A saved FMCSA result less than 24 hours old is reused ("cached").
//  2. Otherwise FMCSA is asked again and the result is saved.
//  3. If FMCSA is down, the last saved result is shown and labelled.
export async function POST(request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const body = await readJson(request);
  const mc = String(body.mc ?? "").replace(/\D/g, "");
  if (!/^[0-9]{6,8}$/.test(mc)) return jsonError("MC number must be 6–8 digits.");

  const { data: saved } = await supabase.from("brokers").select("*").eq("mc_number", mc).maybeSingle();

  const savedIsFresh = saved && (saved.source === "manual" || !isStale(saved.checked_at));
  if (savedIsFresh && body.refresh !== true) {
    return NextResponse.json({ broker: saved, origin: "cache", fmcsaConfigured: fmcsaConfigured() });
  }

  if (!fmcsaConfigured()) {
    return NextResponse.json({
      broker: saved ?? null,
      origin: saved ? "cache" : "none",
      fmcsaConfigured: false,
      message: "FMCSA lookup isn't set up (no FMCSA_WEB_KEY), so record the broker's authority by hand below.",
    });
  }

  try {
    const result = await lookupBrokerByMc(mc);
    // Keep a start date the dispatcher already recorded (FMCSA doesn't give one)
    if (!result.authority_granted_on && saved?.authority_granted_on) {
      result.authority_granted_on = saved.authority_granted_on;
    }
    const { data, error } = await supabase
      .from("brokers")
      .upsert({ ...result, notes: saved?.notes ?? null, checked_at: new Date().toISOString() })
      .select("*")
      .maybeSingle();
    if (error) return jsonError(friendlyDbError(error));
    return NextResponse.json({ broker: data, origin: "fmcsa", fmcsaConfigured: true });
  } catch (error) {
    return NextResponse.json({
      broker: saved ?? null,
      origin: saved ? "stale-cache" : "none",
      fmcsaConfigured: true,
      message: saved
        ? `FMCSA is unavailable (${error.message}). Showing the result saved on ${new Date(saved.checked_at).toLocaleString("en-US")}.`
        : `FMCSA is unavailable (${error.message}). Record the broker's authority by hand, or try again later.`,
    });
  }
}
