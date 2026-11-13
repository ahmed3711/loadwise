"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { formatWeek, mondayOf, todayString } from "@/lib/format";
import { isRealDate } from "@/lib/validation/common";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { InvoiceIcon } from "@/components/icons";

// Pick a carrier and a week -> the database works out the invoice
export default function GenerateInvoiceForm({ carriers, defaultWeek }) {
  const router = useRouter();
  const [carrierId, setCarrierId] = useState(carriers[0] ? String(carriers[0].id) : "");
  const [week, setWeek] = useState(defaultWeek);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const weekIsValid = isRealDate(week) && week <= todayString();
  const carrier = carriers.find((c) => String(c.id) === carrierId);

  async function generate(event) {
    event.preventDefault();
    const newErrors = {};
    if (!carrierId) newErrors.carrier = "Choose a carrier";
    if (!isRealDate(week)) newErrors.week = "Choose a real date";
    else if (week > todayString()) newErrors.week = "The week can't be in the future";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    setServerError("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("generate_invoice", {
      p_carrier_id: Number(carrierId),
      p_week: mondayOf(week),
    });
    if (error) {
      setServerError(friendlyDbError(error));
      setSaving(false);
      return;
    }
    router.push(`/invoices/${data}`);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={generate} noValidate className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
            <InvoiceIcon className="h-5 w-5 text-brand" /> Generate a weekly invoice
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Totals come from the delivered bookings only, never typed by hand. Running it again for the same week adds
            loads delivered since.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
          <Select
            id="invoice-carrier"
            label="Carrier"
            options={carriers.map((c) => ({ value: String(c.id), label: `${c.company_name} (${c.fee_percent}% fee)` }))}
            placeholder="Choose a carrier"
            value={carrierId}
            onChange={(event) => setCarrierId(event.target.value)}
            error={errors.carrier}
          />
          <Input
            id="invoice-week"
            label="Any day in the week"
            type="date"
            max={todayString()}
            value={week}
            onChange={(event) => setWeek(event.target.value)}
            hint={weekIsValid ? `Week of ${formatWeek(mondayOf(week))}` : "Monday–Sunday week"}
            error={errors.week}
          />
          <Button type="submit" loading={saving} className="sm:mt-6" disabled={!carrier}>
            {saving ? "Generating…" : "Generate invoice"}
          </Button>
        </div>

        <Alert type="error">{serverError}</Alert>
      </form>
    </Card>
  );
}
