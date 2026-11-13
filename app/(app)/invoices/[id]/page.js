import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { formatDate, formatMoney, formatPhone, formatWeek } from "@/lib/format";
import BackLink from "@/components/ui/BackLink";
import Badge from "@/components/ui/Badge";
import InvoiceActions from "@/components/invoices/InvoiceActions";
import { TruckIcon } from "@/components/icons";

export const metadata = { title: "Invoice" };

// Printable invoice (browser "Print" -> "Save as PDF")
export default async function InvoicePage({ params }) {
  const { id } = await params;
  const { profile } = await getCurrentUser();
  if (profile.role === "driver") redirect("/dashboard");
  if (!/^[0-9]+$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: invoice }, { data: lines }] = await Promise.all([
    supabase.from("invoices").select("*, carriers(*)").eq("id", id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, status, loads(origin_city, origin_state, destination_city, destination_state, delivery_date, rate_usd, broker_name, loaded_miles)")
      .eq("invoice_id", id),
  ]);
  if (!invoice) notFound();

  const carrier = invoice.carriers;
  const sorted = (lines ?? []).sort((a, b) => String(a.loads?.delivery_date).localeCompare(String(b.loads?.delivery_date)));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink href="/invoices">Back to invoices</BackLink>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} canEdit={canManage(profile.role)} />
      </div>

      <article className="rounded-2xl border border-line bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-brand">
              <TruckIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold text-navy">
                Load<span className="text-brand">Wise</span>
              </p>
              <p className="text-xs text-slate-500">Dispatch services</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-navy">Invoice</p>
            <p className="font-mono text-sm text-slate-600">{invoice.invoice_number}</p>
            <div className="mt-2">
              <Badge color={invoice.status === "paid" ? "green" : "amber"}>
                {invoice.status === "paid" ? `Paid ${formatDate(invoice.paid_at?.slice(0, 10))}` : "Unpaid"}
              </Badge>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
            <p className="mt-1 font-semibold text-navy">{carrier?.company_name}</p>
            <p className="text-sm text-slate-600">
              MC {carrier?.mc_number} · USDOT {carrier?.dot_number}
            </p>
            <p className="text-sm text-slate-600">
              {carrier?.home_city}, {carrier?.home_state} {carrier?.zip_code}
            </p>
            <p className="text-sm text-slate-600">
              {carrier?.contact_email} · {formatPhone(carrier?.contact_phone)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service period</p>
            <p className="mt-1 font-semibold text-navy">{formatWeek(invoice.week_start)}</p>
            <p className="text-sm text-slate-600">Issued {formatDate(invoice.created_at.slice(0, 10))}</p>
            <p className="text-sm text-slate-600">Dispatch fee: {invoice.fee_percent}% of line-haul</p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2">Delivered</th>
              <th className="py-2 pr-2">Load</th>
              <th className="py-2 pr-2">Broker</th>
              <th className="py-2 pr-2 text-right">Line-haul</th>
              <th className="py-2 text-right">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((line) => (
              <tr key={line.id}>
                <td className="py-2 pr-2 whitespace-nowrap">{formatDate(line.loads?.delivery_date)}</td>
                <td className="py-2 pr-2">
                  {line.loads?.origin_city}, {line.loads?.origin_state} → {line.loads?.destination_city},{" "}
                  {line.loads?.destination_state}
                  <span className="block text-xs text-slate-500">{line.loads?.loaded_miles} mi</span>
                </td>
                <td className="py-2 pr-2">{line.loads?.broker_name}</td>
                <td className="py-2 pr-2 text-right">{formatMoney(line.loads?.rate_usd ?? 0)}</td>
                <td className="py-2 text-right">
                  {formatMoney(((line.loads?.rate_usd ?? 0) * invoice.fee_percent) / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Loads delivered</dt>
            <dd className="font-medium text-navy">{invoice.load_count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Total line-haul</dt>
            <dd className="font-medium text-navy">{formatMoney(invoice.total_line_haul)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-semibold text-navy">Amount due ({invoice.fee_percent}%)</dt>
            <dd className="font-bold text-navy">{formatMoney(invoice.fee_amount)}</dd>
          </div>
        </dl>

        <p className="mt-8 border-t border-line pt-4 text-xs text-slate-500">
          Calculated automatically by LoadWise from recorded booking data. Please contact your dispatcher with any
          questions about this invoice.
        </p>
      </article>
    </div>
  );
}
