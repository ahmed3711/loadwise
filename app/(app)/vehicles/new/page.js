import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import EmptyState from "@/components/ui/EmptyState";
import LinkButton from "@/components/ui/LinkButton";
import VehicleForm from "@/components/vehicles/VehicleForm";

export const metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/vehicles");
  }

  // Carriers for the dropdown (RLS: a dispatcher only gets their own)
  const supabase = await createClient();
  const { data: carriers } = await supabase
    .from("carriers")
    .select("id, company_name")
    .order("company_name");

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/vehicles">Back to vehicles</BackLink>
      <PageHeader title="Add vehicle" description="Add a vehicle and its limits to one of your carriers." />

      {!carriers || carriers.length === 0 ? (
        <EmptyState
          title="Add a carrier first"
          message="Every vehicle belongs to a carrier, and you don't have any carriers yet."
          action={<LinkButton href="/carriers/new">+ Add carrier</LinkButton>}
        />
      ) : (
        <VehicleForm carriers={carriers} />
      )}
    </div>
  );
}
