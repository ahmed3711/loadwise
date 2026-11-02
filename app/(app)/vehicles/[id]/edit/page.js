import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import VehicleForm from "@/components/vehicles/VehicleForm";

export const metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params }) {
  const { id } = await params;
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/vehicles");
  }
  if (!/^[0-9]+$/.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const [{ data: vehicle }, { data: carriers }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase.from("carriers").select("id, company_name").order("company_name"),
  ]);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/vehicles">Back to vehicles</BackLink>
      <PageHeader title="Edit vehicle" description={`Plate ${vehicle.plate_number}`} />
      <VehicleForm vehicle={vehicle} carriers={carriers ?? []} />
    </div>
  );
}
