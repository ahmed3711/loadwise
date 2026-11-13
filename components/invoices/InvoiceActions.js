"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { CheckIcon, PrintIcon } from "@/components/icons";

// Print and "Mark paid" buttons above an invoice
export default function InvoiceActions({ invoiceId, status, canEdit }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function markPaid() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("mark_invoice_paid", { p_invoice_id: invoiceId });
    setSaving(false);
    if (rpcError) setError(friendlyDbError(rpcError));
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <Alert type="error">{error}</Alert>}
      {canEdit && status === "unpaid" && (
        <Button variant="secondary" onClick={markPaid} loading={saving}>
          <CheckIcon className="h-4 w-4" /> Mark paid
        </Button>
      )}
      <Button onClick={() => window.print()}>
        <PrintIcon className="h-4 w-4" /> Print / Save PDF
      </Button>
    </div>
  );
}
