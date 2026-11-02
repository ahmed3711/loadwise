import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import LoadForm from "@/components/loads/LoadForm";

export const metadata = { title: "Add load" };

export default async function NewLoadPage() {
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/loads");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/loads">Back to loads</BackLink>
      <PageHeader title="Add load" description="Enter a load offered by a broker." />
      <LoadForm />
    </div>
  );
}
