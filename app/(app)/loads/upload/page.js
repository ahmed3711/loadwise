import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManage } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import BackLink from "@/components/ui/BackLink";
import CsvUpload from "@/components/loads/CsvUpload";

export const metadata = { title: "Upload loads (CSV)" };

export default async function UploadLoadsPage() {
  const { profile } = await getCurrentUser();

  if (!canManage(profile.role)) {
    redirect("/loads");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/loads">Back to loads</BackLink>
      <PageHeader
        title="Upload loads from CSV"
        description="Every row is checked with the same rules as the load form. Valid rows are saved; rejected rows are listed with the reason."
      />
      <CsvUpload />
    </div>
  );
}
