import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { fmcsaConfigured } from "@/lib/brokers/fmcsa";
import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import BrokerCheck from "@/components/brokers/BrokerCheck";
import BrokersTable from "@/components/brokers/BrokersTable";

export const metadata = { title: "Broker Check" };

// Broker Risk Check (FR-10, FR-11, NFR-04)
export default async function BrokersPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  if (profile.role === "driver") redirect("/dashboard");
  const isManager = canManage(profile.role);
  const { mc } = await searchParams;

  const supabase = await createClient();
  const [{ data: brokers, error }, { data: loads }] = await Promise.all([
    supabase.from("brokers").select("*").order("checked_at", { ascending: false }),
    supabase.from("loads").select("broker_name, broker_mc, status"),
  ]);

  // Brokers on loads that have never been checked
  const checked = new Set((brokers ?? []).map((b) => b.mc_number));
  const unchecked = [
    ...new Map(
      (loads ?? [])
        .filter((l) => !checked.has(l.broker_mc))
        .map((l) => [l.broker_mc, { mc: l.broker_mc, name: l.broker_name }])
    ).values(),
  ];

  return (
    <>
      <PageHeader
        title="Broker Check"
        description="Check a broker's operating authority by MC number before booking. Inactive or under-12-month authority is high risk."
      />

      <div className="space-y-6">
        {error && (
          <Alert type="error">
            Could not load brokers: {error.message}. If the table is missing, run supabase/schema-part2.sql.
          </Alert>
        )}

        {isManager && (
          <BrokerCheck
            initialMc={/^[0-9]{6,8}$/.test(mc ?? "") ? mc : ""}
            fmcsaReady={fmcsaConfigured()}
            unchecked={unchecked}
          />
        )}

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-navy">Checked brokers</h2>
          <BrokersTable brokers={brokers ?? []} />
        </section>
      </div>
    </>
  );
}
