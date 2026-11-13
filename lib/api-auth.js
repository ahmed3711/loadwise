import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";

// Login + role check for API routes (app/api/...).
// Returns { supabase, userId, profile } when allowed, or { error: Response }.
// Row Level Security still applies to every query made with this client.
export async function requireManager() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return { error: jsonError("Please log in again.", 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (!canManage(profile?.role)) {
    return { error: jsonError("Only Admins and Dispatchers can do this.", 403) };
  }

  return { supabase, userId, profile };
}

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// Reads the JSON body safely (returns {} for an empty or broken body)
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Checks an id from the request is a positive whole number
export function toId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
