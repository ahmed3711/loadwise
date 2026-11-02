import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import CarrierForm from "@/components/carriers/CarrierForm";

export const metadata = { title: "Edit carrier" };

export default async function EditCarrierPage({ params }) {
  const { id } = await params;
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/carriers");
  }

  // The id in the address must be a number
  if (!/^[0-9]+$/.test(id)) {
    notFound();
  }

  // RLS: a dispatcher only finds carriers they created
  const supabase = await createClient();
  const { data: carrier } = await supabase.from("carriers").select("*").eq("id", id).maybeSingle();

  if (!carrier) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/carriers">Back to carriers</BackLink>
      <PageHeader title="Edit carrier" description={carrier.company_name} />
      <CarrierForm carrier={carrier} />
    </div>
  );
}
