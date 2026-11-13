"use client";

import { useState } from "react";
import Link from "next/link";
import { useDeleteRow } from "@/lib/use-delete-row";
import { formatMoney, formatWeek } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { InvoiceIcon } from "@/components/icons";

export default function InvoicesTable({ invoices, canEdit }) {
  const [search, setSearch] = useState("");
  const { rowToDelete, askToDelete, cancelDelete, confirmDelete, deleting, message } = useDeleteRow("invoices");

  if (invoices.length === 0) {
    return (
      <>
        <Alert type={message?.type}>{message?.text}</Alert>
        <EmptyState
          icon={<InvoiceIcon className="h-6 w-6" />}
          title="No invoices yet"
          message="Mark booked loads as Delivered, then generate the week's invoice above."
        />
      </>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = invoices.filter((i) =>
    [i.invoice_number, i.carriers?.company_name, i.status].join(" ").toLowerCase().includes(term)
  );

  const unpaidTotal = invoices.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + Number(i.fee_amount), 0);

  const columns = [
    {
      key: "number",
      label: "Invoice",
      render: (i) => (
        <Link href={`/invoices/${i.id}`} className="font-semibold text-navy underline-offset-2 hover:underline">
          {i.invoice_number}
        </Link>
      ),
    },
    { key: "carrier", label: "Carrier", render: (i) => i.carriers?.company_name ?? "—" },
    { key: "week", label: "Week", render: (i) => <span className="whitespace-nowrap">{formatWeek(i.week_start)}</span> },
    { key: "loads", label: "Loads", render: (i) => i.load_count },
    { key: "linehaul", label: "Line-haul", render: (i) => formatMoney(i.total_line_haul) },
    {
      key: "fee",
      label: "Fee",
      render: (i) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatMoney(i.fee_amount)}</p>
          <p className="text-xs text-slate-500">{i.fee_percent}%</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (i) => <Badge color={i.status === "paid" ? "green" : "amber"}>{i.status === "paid" ? "Paid" : "Unpaid"}</Badge>,
    },
    {
      key: "actions",
      label: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/invoices/${i.id}`}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-brand hover:bg-brand-soft"
          >
            View
          </Link>
          {canEdit && i.status === "unpaid" && (
            <button
              type="button"
              onClick={() => askToDelete(i)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Alert type={message?.type}>{message?.text}</Alert>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search invoice, carrier…" />
        <p className="text-sm text-slate-500">
          Unpaid fees: <span className="font-semibold text-navy">{formatMoney(unpaidTotal)}</span>
        </p>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No invoices match "${search}".`} />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}
      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Delete this invoice?"
        message={rowToDelete && `Invoice ${rowToDelete.invoice_number} will be deleted. Its loads can be invoiced again.`}
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={() => confirmDelete(`Invoice ${rowToDelete.invoice_number} was deleted.`)}
      />
    </div>
  );
}
