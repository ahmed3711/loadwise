"use client";

import { useState } from "react";
import { useDeleteRow } from "@/lib/use-delete-row";
import { EQUIPMENT_TYPES, LOAD_STATUSES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import RowActions from "@/components/ui/RowActions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LinkButton from "@/components/ui/LinkButton";
import StatusBadge from "./StatusBadge";
import { BoxIcon } from "@/components/icons";

// Table of loads with search, edit and delete
export default function LoadsTable({ loads, canEdit }) {
  const [search, setSearch] = useState("");
  const { rowToDelete, askToDelete, cancelDelete, confirmDelete, deleting, message } =
    useDeleteRow("loads");

  if (loads.length === 0) {
    return (
      <>
        <Alert type={message?.type}>{message?.text}</Alert>
        <EmptyState
          icon={<BoxIcon className="h-6 w-6" />}
          title="No loads yet"
          message={
            canEdit
              ? "Add a load with the form, or upload many at once with a CSV file."
              : "Loads added by dispatchers will appear here."
          }
          action={
            canEdit && (
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/loads/new">+ Add your first load</LinkButton>
                <LinkButton href="/loads/upload" variant="secondary">
                  Upload CSV
                </LinkButton>
              </div>
            )
          }
        />
      </>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = loads.filter((load) =>
    [
      load.origin_city,
      load.origin_state,
      load.destination_city,
      load.destination_state,
      load.broker_name,
      load.broker_mc,
      labelFor(EQUIPMENT_TYPES, load.equipment_type),
      labelFor(LOAD_STATUSES, load.status),
    ]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );

  const columns = [
    {
      key: "lane",
      label: "Lane",
      render: (load) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">
            {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
          </p>
          <p className="text-xs text-slate-500">{formatNumber(load.loaded_miles)} loaded miles</p>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Pickup → Delivery",
      render: (load) => (
        <span className="whitespace-nowrap">
          {formatDate(load.pickup_date)} → {formatDate(load.delivery_date)}
        </span>
      ),
    },
    {
      key: "freight",
      label: "Freight",
      render: (load) => (
        <div className="whitespace-nowrap text-xs">
          <p className="font-medium text-navy">{labelFor(EQUIPMENT_TYPES, load.equipment_type)}</p>
          <p className="text-slate-500">
            {formatNumber(load.weight_lbs)} lbs · {load.pallet_count} pallets · {load.length_ft} ft
          </p>
        </div>
      ),
    },
    {
      key: "rate",
      label: "Rate",
      render: (load) => (
        <div className="whitespace-nowrap">
          <p className="font-semibold">{formatMoney(load.rate_usd)}</p>
          <p className="text-xs text-slate-500">{formatMoney(load.rate_usd / load.loaded_miles)}/mi</p>
        </div>
      ),
    },
    {
      key: "broker",
      label: "Broker",
      render: (load) => (
        <div className="whitespace-nowrap">
          <p>{load.broker_name}</p>
          <p className="text-xs text-slate-500">MC {load.broker_mc}</p>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (load) => <StatusBadge status={load.status} /> },
  ];

  if (canEdit) {
    columns.push({
      key: "actions",
      label: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (load) => (
        <RowActions
          editHref={`/loads/${load.id}/edit`}
          onDelete={() => askToDelete(load)}
          label={`load ${load.origin_city} to ${load.destination_city}`}
        />
      ),
    });
  }

  return (
    <div className="space-y-4">
      <Alert type={message?.type}>{message?.text}</Alert>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search city, state, broker, status…" />
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {loads.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No loads match "${search}".`} />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Delete this load?"
        message={
          rowToDelete &&
          `The load ${rowToDelete.origin_city}, ${rowToDelete.origin_state} → ${rowToDelete.destination_city}, ${rowToDelete.destination_state} will be permanently deleted.`
        }
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={() =>
          confirmDelete(`Load ${rowToDelete.origin_city} → ${rowToDelete.destination_city} was deleted.`)
        }
      />
    </div>
  );
}
