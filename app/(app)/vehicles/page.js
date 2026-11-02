import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Flash from "@/components/ui/Flash";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import { PlusIcon } from "@/components/icons";

export const metadata = { title: "Vehicles" };

const SUCCESS_MESSAGES = {
  added: "Vehicle added successfully.",
  updated: "Vehicle updated successfully.",
};

export default async function VehiclesPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  const { success } = await searchParams;
  const isManager = canManage(profile.role);

  const supabase = await createClient();

  // "carriers(company_name)" also fetches the name of each vehicle's carrier
  const [{ data: vehicles, error }, { count: carrierCount }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*, carriers(company_name)")
      .order("created_at", { ascending: false }),
    supabase.from("carriers").select("*", { count: "exact", head: true }),
  ]);

  const hasCarriers = (carrierCount ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="Vehicles"
        description={
          isManager
            ? "Each vehicle's interior size, payload and pallet limits."
            : "View only: vehicles and their limits."
        }
        actions={
          isManager &&
          hasCarriers && (
            <LinkButton href="/vehicles/new">
              <PlusIcon className="h-4 w-4" /> Add vehicle
            </LinkButton>
          )
        }
      />

      <div className="space-y-4">
        <Flash message={SUCCESS_MESSAGES[success]} />
        {error ? (
          <Alert type="error">Could not load vehicles: {error.message}</Alert>
        ) : (
          <VehiclesTable vehicles={vehicles} canEdit={isManager} hasCarriers={hasCarriers} />
        )}
      </div>
    </>
  );
}
