import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage, EQUIPMENT_TYPES, labelFor } from "@/lib/constants";
import { rankForVehicle } from "@/lib/matching/engine";
import { aiConfigured } from "@/lib/ai/claude";
import { distanceServiceConfigured } from "@/lib/matching/distance";
import { formatNumber } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import VehiclePicker from "@/components/matching/VehiclePicker";
import MatchingWorkspace from "@/components/matching/MatchingWorkspace";
import ExcludedLoads from "@/components/matching/ExcludedLoads";
import { BeakerIcon, MapPinIcon, TargetIcon, TruckIcon } from "@/components/icons";

export const metadata = { title: "Load Matching" };

// Matching Engine page (FR-05 to FR-09)
export default async function MatchingPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  if (!canManage(profile.role)) redirect("/dashboard");

  const { vehicle: vehicleParam } = await searchParams;
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate_number, equipment_type, carriers(company_name)")
    .order("created_at", { ascending: true });

  const header = (
    <PageHeader
      title="Load Matching"
      description="Loads that fit the vehicle, ranked by a 0–100 score: net rate per mile, empty miles, preferred lanes and broker trust."
      actions={
        <LinkButton href="/matching/weights" variant="secondary">
          <BeakerIcon className="h-4 w-4" /> Weight Lab
        </LinkButton>
      }
    />
  );

  if (!vehicles || vehicles.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<TruckIcon className="h-6 w-6" />}
          title="Add a vehicle first"
          message="Matching works per vehicle, because each vehicle has its own size, payload and pallet limits."
          action={<LinkButton href="/vehicles/new">+ Add vehicle</LinkButton>}
        />
      </>
    );
  }

  const selectedId = vehicles.some((v) => String(v.id) === vehicleParam) ? Number(vehicleParam) : vehicles[0].id;

  let ranking = null;
  let rankError = "";
  try {
    ranking = await rankForVehicle(supabase, selectedId);
  } catch (error) {
    rankError = error.message;
  }

  const vehicleOptions = vehicles.map((v) => ({
    value: String(v.id),
    label: `${v.plate_number} · ${labelFor(EQUIPMENT_TYPES, v.equipment_type)} · ${v.carriers?.company_name ?? "—"}`,
  }));

  return (
    <>
      {header}

      <div className="space-y-6">
        <VehiclePicker options={vehicleOptions} value={String(selectedId)} />

        {rankError && <Alert type="error">Could not rank loads: {rankError}</Alert>}

        {ranking && (
          <>
            {/* The truck being matched */}
            <section className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matching for</p>
                <p className="mt-1 text-lg font-bold text-navy">
                  {ranking.vehicle.plate_number} · {labelFor(EQUIPMENT_TYPES, ranking.vehicle.equipment_type)}
                </p>
                <p className="text-sm text-slate-500">{ranking.carrier.company_name}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-navy">
                  <MapPinIcon className="h-4 w-4 text-brand" />
                  Truck at {ranking.from.city}, {ranking.from.state}
                  {ranking.from.isHomeBase && <span className="text-slate-500">(home base, no current location set)</span>}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 md:grid-cols-2">
                <Limit label="Interior length" value={`${ranking.vehicle.length_ft} ft`} />
                <Limit label="Max payload" value={`${formatNumber(ranking.vehicle.max_payload_lbs)} lbs`} />
                <Limit label="Pallet spaces" value={ranking.vehicle.max_pallets} />
                <Limit label="Carrier minimum" value={`$${Number(ranking.carrier.min_rate_per_mile).toFixed(2)}/mi`} />
              </dl>
            </section>

            {/* Summary numbers */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Matching loads" value={ranking.ranked.length} />
              <Stat label="Left out (don't fit)" value={ranking.excluded.length} />
              <Stat label="Best score" value={ranking.ranked[0]?.score ?? "—"} />
              <Stat
                label="Ranked in"
                value={`${ranking.elapsedMs} ms`}
                note={
                  <Badge color={ranking.distanceSource === "openrouteservice" ? "green" : "slate"}>
                    {ranking.distanceSource === "openrouteservice" ? "Road miles (ORS)" : "Estimated miles"}
                  </Badge>
                }
              />
            </div>

            {!distanceServiceConfigured() && (
              <Alert type="info">
                Empty miles are estimated (straight-line distance × 1.2). Add an OPENROUTESERVICE_API_KEY to use real
                truck driving distances.
              </Alert>
            )}

            {ranking.ranked.length === 0 ? (
              <EmptyState
                icon={<TargetIcon className="h-6 w-6" />}
                title={ranking.totalLoads === 0 ? "No available loads" : "No loads fit this vehicle"}
                message={
                  ranking.totalLoads === 0
                    ? "Add loads (form or CSV) with a pickup date from today onwards."
                    : "Every available load is too big, too heavy or needs different equipment. See the list below."
                }
                action={<LinkButton href="/loads/new">+ Add load</LinkButton>}
              />
            ) : (
              <MatchingWorkspace
                vehicleId={ranking.vehicle.id}
                carrier={{
                  id: ranking.carrier.id,
                  company_name: ranking.carrier.company_name,
                  min_rate_per_mile: ranking.carrier.min_rate_per_mile,
                }}
                weights={ranking.weights}
                ranked={ranking.ranked}
                brokers={Object.fromEntries(ranking.brokers)}
                aiReady={aiConfigured()}
              />
            )}

            <ExcludedLoads excluded={ranking.excluded} />
          </>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-3xl font-bold text-navy">{value}</p>
        {note}
      </div>
    </div>
  );
}

function Limit({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}
