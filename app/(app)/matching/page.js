import { createClient } from "@/lib/supabase/server";
import { getMatchableLoads, getVehiclesWithCarriers } from "@/lib/matching/data";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import LinkButton from "@/components/ui/LinkButton";
import MatchingWorkspace from "@/components/matching/MatchingWorkspace";
import { TruckIcon } from "@/components/icons";

export const metadata = { title: "Load Matching" };

// Load Matching (FR-05 to FR-08): pick a vehicle and see every available
// load ranked for it. The data is read here on the server; the ranking
// runs in the browser, so switching the ranking mode is instant.
export default async function MatchingPage({ searchParams }) {
  const { vehicle } = await searchParams;
  const supabase = await createClient();

  const [{ data: vehicles, error: vehicleError }, { data: loads, error: loadError }] = await Promise.all([
    getVehiclesWithCarriers(supabase),
    getMatchableLoads(supabase),
  ]);
  const error = vehicleError ?? loadError;

  return (
    <>
      <PageHeader
        title="Load Matching"
        description="Pick a vehicle: loads that don't fit are filtered out, the rest are ranked by real profit."
      />

      {error ? (
        <Alert type="error">Could not load matching data: {error.message}</Alert>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={<TruckIcon className="h-6 w-6" />}
          title="No vehicles yet"
          message="Add a carrier and at least one vehicle, then come back to match loads to it."
          action={<LinkButton href="/vehicles">Go to Vehicles</LinkButton>}
        />
      ) : (
        <MatchingWorkspace vehicles={vehicles} loads={loads} initialVehicleId={vehicle} />
      )}
    </>
  );
}
