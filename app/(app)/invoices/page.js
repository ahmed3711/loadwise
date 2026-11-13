import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { addDays, mondayOf, todayString } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import GenerateInvoiceForm from "@/components/invoices/GenerateInvoiceForm";
import InvoicesTable from "@/components/invoices/InvoicesTable";

export const metadata = { title: "Invoices" };

// Weekly dispatch-fee invoices (FR-14)
export default async function InvoicesPage() {
  const { profile } = await getCurrentUser();
  if (profile.role === "driver") redirect("/dashboard");
  const isManager = canManage(profile.role);

  const supabase = await createClient();
  const [{ data: invoices, error }, { data: carriers }] = await Promise.all([
    supabase.from("invoices").select("*, carriers(company_name)").order("week_start", { ascending: false }),
    supabase.from("carriers").select("id, company_name, fee_percent").order("company_name"),
  ]);

  // Default: last week (the week that has just finished)
  const lastWeek = addDays(mondayOf(todayString()), -7);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Each week, every carrier is billed its dispatch-fee % of the line-haul rate of the loads delivered that week."
      />
      <div className="space-y-6">
        {error && (
          <Alert type="error">
            Could not load invoices: {error.message}. If the table is missing, run supabase/schema-part2.sql.
          </Alert>
        )}
        {isManager && <GenerateInvoiceForm carriers={carriers ?? []} defaultWeek={lastWeek} />}
        <InvoicesTable invoices={invoices ?? []} canEdit={isManager} />
      </div>
    </>
  );
}
