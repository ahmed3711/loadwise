import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Flash from "@/components/ui/Flash";
import CarriersTable from "@/components/carriers/CarriersTable";
import { PlusIcon } from "@/components/icons";

export const metadata = { title: "Carriers" };

const SUCCESS_MESSAGES = {
  added: "Carrier added successfully.",
  updated: "Carrier updated successfully.",
};

export default async function CarriersPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  const { success } = await searchParams;
  const isManager = canManage(profile.role);

  // Row Level Security decides which carriers come back:
  // admin = all, dispatcher = their own, owner/driver = all (read only)
  const supabase = await createClient();
  const { data: carriers, error } = await supabase
    .from("carriers")
    .select("*, vehicles(count)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Carriers"
        description={
          isManager
            ? "Trucking companies you dispatch for, with their limits and preferences."
            : "View only: trucking companies in LoadWise."
        }
        actions={
          isManager && (
            <LinkButton href="/carriers/new">
              <PlusIcon className="h-4 w-4" /> Add carrier
            </LinkButton>
          )
        }
      />

      <div className="space-y-4">
        <Flash message={SUCCESS_MESSAGES[success]} />
        {error ? (
          <Alert type="error">Could not load carriers: {error.message}</Alert>
        ) : (
          <CarriersTable carriers={carriers} canEdit={isManager} />
        )}
      </div>
    </>
  );
}
