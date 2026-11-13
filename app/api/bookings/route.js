import { NextResponse } from "next/server";
import { requireManager, jsonError, readJson, toId } from "@/lib/api-auth";
import { getVehicleWithCarrier, scoreOneLoad } from "@/lib/matching/engine";
import { riskReason } from "@/lib/brokers/risk.mjs";
import { friendlyDbError } from "@/lib/db-errors";

// POST /api/bookings  { loadId, vehicleId, confirmRisk }
// Books a load on a vehicle (FR-12, FR-13). The numbers are worked out
// again here on the server, so nobody can save a made-up score.
export async function POST(request) {
  const auth = await requireManager();
  if (auth.error) return auth.error;
  const { supabase } = auth;

  const body = await readJson(request);
  const loadId = toId(body.loadId);
  const vehicleId = toId(body.vehicleId);
  if (!loadId || !vehicleId) return jsonError("Choose a load and a vehicle.");

  const [vehicle, { data: load }] = await Promise.all([
    getVehicleWithCarrier(supabase, vehicleId),
    supabase.from("loads").select("*").eq("id", loadId).maybeSingle(),
  ]);
  if (!vehicle) return jsonError("Vehicle not found.", 404);
  if (!load) return jsonError("Load not found.", 404);
  if (load.status !== "available") return jsonError("This load has already been booked.", 409);

  const result = await scoreOneLoad(supabase, vehicle, load);

  // Hard fit filter (the database checks this again)
  if (!result.fit.fits) {
    return jsonError(`This load doesn't fit the vehicle: ${result.fit.reasons.join("; ")}.`, 422);
  }

  // Risk gate (FR-12): high-risk or unchecked broker -> must confirm
  const needsConfirmation = result.brokerRisk !== "low";
  if (needsConfirmation && body.confirmRisk !== true) {
    return jsonError("This broker needs your confirmation before booking.", 409, {
      needsConfirmation: true,
      risk: result.brokerRisk,
      reason: riskReason(result.broker),
    });
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      load_id: load.id,
      vehicle_id: vehicle.id,
      carrier_id: vehicle.carrier_id,
      deadhead_miles: result.deadheadMiles,
      net_rpm: result.netRpm,
      score: result.score,
      risk_confirmed: needsConfirmation,
    })
    .select("id")
    .maybeSingle();

  if (error) return jsonError(friendlyDbError(error), 400);
  if (!data) return jsonError("You don't have permission to book this load.", 403);

  return NextResponse.json({ bookingId: data.id });
}
