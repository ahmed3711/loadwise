import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import CarrierForm from "@/components/carriers/CarrierForm";

export const metadata = { title: "Add carrier" };

export default async function NewCarrierPage() {
  const { profile } = await getCurrentUser();

  // Carrier Owners and Drivers can only view
  if (!canManage(profile.role)) {
    redirect("/carriers");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/carriers">Back to carriers</BackLink>
      <PageHeader
        title="Add carrier"
        description="Save the carrier's details, home base and load preferences."
      />
      <CarrierForm />
    </div>
  );
}
