import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import LoadForm from "@/components/loads/LoadForm";

export const metadata = { title: "Edit load" };

export default async function EditLoadPage({ params }) {
  const { id } = await params;
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/loads");
  }
  if (!/^[0-9]+$/.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: load } = await supabase.from("loads").select("*").eq("id", id).maybeSingle();

  if (!load) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/loads">Back to loads</BackLink>
      <PageHeader
        title="Edit load"
        description={`${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`}
      />
      <LoadForm load={load} />
    </div>
  );
}
