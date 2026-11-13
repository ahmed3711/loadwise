import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { carrierWeights } from "@/lib/matching/scoring.mjs";
import { threadCount } from "@/lib/threads/pool.mjs";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import EmptyState from "@/components/ui/EmptyState";
import LinkButton from "@/components/ui/LinkButton";
import VehiclePicker from "@/components/matching/VehiclePicker";
import WeightLab from "@/components/matching/WeightLab";
import { BeakerIcon } from "@/components/icons";

export const metadata = { title: "Weight Lab" };

// Weight Lab: compares score weight sets against the carrier's booking
// history, using worker threads (multithreading).
export default async function WeightLabPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  if (!canManage(profile.role)) redirect("/dashboard");

  const { carrier: carrierParam } = await searchParams;
  const supabase = await createClient();
  const { data: carriers } = await supabase
    .from("carriers")
    .select("id, company_name, weight_rpm, weight_deadhead, weight_lane, weight_broker")
    .order("company_name");

  const header = (
    <>
      <BackLink href="/matching">Back to Load Matching</BackLink>
      <PageHeader
        title="Weight Lab"
        description="Finds the score weights that best match the loads you actually booked. The search runs on several CPU threads at once."
      />
    </>
  );

  if (!carriers || carriers.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<BeakerIcon className="h-6 w-6" />}
          title="No carriers yet"
          message="Add a carrier, its vehicles and some bookings first."
          action={<LinkButton href="/carriers/new">+ Add carrier</LinkButton>}
        />
      </>
    );
  }

  const selected = carriers.find((c) => String(c.id) === carrierParam) ?? carriers[0];

  return (
    <>
      {header}
      <div className="space-y-6">
        <VehiclePicker
          label="Carrier"
          param="carrier"
          basePath="/matching/weights"
          options={carriers.map((c) => ({ value: String(c.id), label: c.company_name }))}
          value={String(selected.id)}
        />
        <WeightLab
          key={selected.id}
          carrier={{ id: selected.id, company_name: selected.company_name }}
          currentWeights={carrierWeights(selected)}
          threads={threadCount()}
        />
      </div>
    </>
  );
}
