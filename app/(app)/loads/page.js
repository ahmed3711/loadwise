import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Flash from "@/components/ui/Flash";
import LoadsTable from "@/components/loads/LoadsTable";
import { PlusIcon, UploadIcon } from "@/components/icons";

export const metadata = { title: "Loads" };

const SUCCESS_MESSAGES = {
  added: "Load added successfully.",
  updated: "Load updated successfully.",
};

export default async function LoadsPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  const { success } = await searchParams;
  const isManager = canManage(profile.role);

  const supabase = await createClient();
  const { data: loads, error } = await supabase
    .from("loads")
    .select("*")
    .order("pickup_date", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Loads"
        description={
          isManager
            ? "Freight entered by form or CSV upload, sorted by pickup date."
            : "View only: loads entered by dispatchers."
        }
        actions={
          isManager && (
            <>
              <LinkButton href="/loads/upload" variant="secondary">
                <UploadIcon className="h-4 w-4" /> Upload CSV
              </LinkButton>
              <LinkButton href="/loads/new">
                <PlusIcon className="h-4 w-4" /> Add load
              </LinkButton>
            </>
          )
        }
      />

      <div className="space-y-4">
        <Flash message={SUCCESS_MESSAGES[success]} />
        {error ? (
          <Alert type="error">Could not load loads: {error.message}</Alert>
        ) : (
          <LoadsTable loads={loads} canEdit={isManager} />
        )}
      </div>
    </>
  );
}
