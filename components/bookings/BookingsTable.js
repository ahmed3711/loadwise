"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { useDeleteRow } from "@/lib/use-delete-row";
import {
  canManage,
  canMoveBooking,
  EQUIPMENT_TYPES,
  LOAD_STATUSES,
  labelFor,
  nextBookingStatus,
  NEXT_STEP_LABELS,
} from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/loads/StatusBadge";
import RiskBadge from "@/components/brokers/RiskBadge";
import StatusSteps from "./StatusSteps";
import { ClipboardIcon } from "@/components/icons";

const TABS = [
  { key: "active", label: "In progress", statuses: ["booked", "picked_up", "in_transit"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "paid", label: "Paid", statuses: ["paid"] },
  { key: "all", label: "All", statuses: null },
];

export default function BookingsTable({ bookings, role }) {
  const router = useRouter();
  const isManager = canManage(role);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [movingId, setMovingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const { rowToDelete, askToDelete, cancelDelete, confirmDelete, deleting, message } = useDeleteRow("bookings");

  if (bookings.length === 0) {
    return (
      <>
        <Alert type={message?.type}>{message?.text}</Alert>
        <EmptyState
          icon={<ClipboardIcon className="h-6 w-6" />}
          title={role === "driver" ? "No loads assigned to you yet" : "No bookings yet"}
          message={
            role === "driver"
              ? "When a dispatcher books a load on your vehicle, it will appear here."
              : "Book a load from the Load Matching page."
          }
        />
      </>
    );
  }

  async function moveToNext(booking) {
    const next = nextBookingStatus(booking.status);
    setMovingId(booking.id);
    setStatusMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_booking_status", { p_booking_id: booking.id, p_status: next });
    setMovingId(null);
    if (error) {
      setStatusMessage({ type: "error", text: friendlyDbError(error) });
    } else {
      setStatusMessage({
        type: "success",
        text: `${booking.loads?.origin_city} → ${booking.loads?.destination_city} is now ${labelFor(LOAD_STATUSES, next)}.`,
      });
      router.refresh();
    }
  }

  const activeTab = TABS.find((t) => t.key === tab);
  const term = search.trim().toLowerCase();
  const filtered = bookings
    .filter((b) => !activeTab.statuses || activeTab.statuses.includes(b.status))
    .filter((b) =>
      [
        b.loads?.origin_city,
        b.loads?.destination_city,
        b.loads?.broker_name,
        b.carriers?.company_name,
        b.vehicles?.plate_number,
        b.vehicles?.driver?.full_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );

  const columns = [
    {
      key: "load",
      label: "Load",
      render: (b) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">
            {b.loads?.origin_city}, {b.loads?.origin_state} → {b.loads?.destination_city}, {b.loads?.destination_state}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(b.loads?.pickup_date)} → {formatDate(b.loads?.delivery_date)}
          </p>
        </div>
      ),
    },
    {
      key: "vehicle",
      label: "Carrier / vehicle",
      render: (b) => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-sm font-medium text-navy">{b.carriers?.company_name}</p>
          <p className="text-slate-500">
            {b.vehicles?.plate_number} · {labelFor(EQUIPMENT_TYPES, b.vehicles?.equipment_type)}
          </p>
          <p className="text-slate-500">Driver: {b.vehicles?.driver?.full_name ?? "not assigned"}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (b) => (
        <div className="space-y-1.5">
          <StatusBadge status={b.status} />
          <StatusSteps status={b.status} />
        </div>
      ),
    },
    {
      key: "money",
      label: "Rate / net RPM",
      render: (b) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatMoney(b.loads?.rate_usd ?? 0)}</p>
          <p className="text-xs text-slate-500">
            {formatMoney(b.net_rpm)}/mi · {b.deadhead_miles} empty mi · score {b.score}
          </p>
        </div>
      ),
    },
    {
      key: "broker",
      label: "Broker",
      render: (b) => (
        <div className="space-y-1 whitespace-nowrap">
          <p className="text-xs">{b.loads?.broker_name}</p>
          <RiskBadge risk={b.broker_risk} />
          {b.risk_confirmed && <p className="text-[11px] text-slate-500">Confirmed by dispatcher</p>}
        </div>
      ),
    },
    {
      key: "actions",
      label: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (b) => {
        const next = nextBookingStatus(b.status);
        return (
          <div className="flex justify-end gap-2">
            {canMoveBooking(role, next) && (
              <button
                type="button"
                onClick={() => moveToNext(b)}
                disabled={movingId === b.id}
                className="whitespace-nowrap rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-navy transition hover:bg-amber-400 disabled:opacity-60"
              >
                {movingId === b.id ? "Saving…" : NEXT_STEP_LABELS[next]}
              </button>
            )}
            {isManager && b.status === "booked" && (
              <button
                type="button"
                onClick={() => askToDelete(b)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Alert type={statusMessage?.type ?? message?.type}>{statusMessage?.text ?? message?.text}</Alert>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1" role="tablist">
          {TABS.map((t) => {
            const count = bookings.filter((b) => !t.statuses || t.statuses.includes(b.status)).length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.key ? "bg-navy text-white" : "text-slate-600 hover:bg-surface"
                }`}
              >
                {t.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Search city, carrier, driver…" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing here" message="No bookings match this tab or search." />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Cancel this booking?"
        message={
          rowToDelete &&
          `The load ${rowToDelete.loads?.origin_city} → ${rowToDelete.loads?.destination_city} will go back to Available.`
        }
        confirmLabel="Cancel booking"
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={() => confirmDelete("Booking cancelled. The load is available again.")}
      />
    </div>
  );
}
