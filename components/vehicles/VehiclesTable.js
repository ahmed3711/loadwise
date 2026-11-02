"use client";

import { useState } from "react";
import { useDeleteRow } from "@/lib/use-delete-row";
import { EQUIPMENT_TYPES, labelFor } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import RowActions from "@/components/ui/RowActions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LinkButton from "@/components/ui/LinkButton";
import { TruckIcon } from "@/components/icons";

// Table of vehicles with search, edit and delete
export default function VehiclesTable({ vehicles, canEdit, hasCarriers }) {
  const [search, setSearch] = useState("");
  const { rowToDelete, askToDelete, cancelDelete, confirmDelete, deleting, message } =
    useDeleteRow("vehicles");

  if (vehicles.length === 0) {
    let action = null;
    if (canEdit) {
      action = hasCarriers ? (
        <LinkButton href="/vehicles/new">+ Add your first vehicle</LinkButton>
      ) : (
        <LinkButton href="/carriers/new">+ Add a carrier first</LinkButton>
      );
    }
    return (
      <>
        <Alert type={message?.type}>{message?.text}</Alert>
        <EmptyState
          icon={<TruckIcon className="h-6 w-6" />}
          title="No vehicles yet"
          message={
            canEdit
              ? hasCarriers
                ? "Add a vehicle with its interior size, payload and pallet limits."
                : "Every vehicle belongs to a carrier, so add a carrier first."
              : "Vehicles added by dispatchers will appear here."
          }
          action={action}
        />
      </>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = vehicles.filter((vehicle) =>
    [
      vehicle.plate_number,
      vehicle.vin,
      vehicle.carriers?.company_name,
      labelFor(EQUIPMENT_TYPES, vehicle.equipment_type),
    ]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );

  const columns = [
    {
      key: "plate",
      label: "Plate / VIN",
      render: (vehicle) => (
        <div>
          <p className="font-semibold">{vehicle.plate_number}</p>
          <p className="font-mono text-xs text-slate-500">{vehicle.vin}</p>
        </div>
      ),
    },
    {
      key: "carrier",
      label: "Carrier",
      render: (vehicle) => vehicle.carriers?.company_name ?? "—",
    },
    {
      key: "type",
      label: "Equipment",
      render: (vehicle) => <Badge color="blue">{labelFor(EQUIPMENT_TYPES, vehicle.equipment_type)}</Badge>,
    },
    {
      key: "size",
      label: "Interior (L × W × H)",
      render: (vehicle) => (
        <span className="whitespace-nowrap">
          {vehicle.length_ft} ft × {vehicle.width_in} in × {vehicle.height_in} in
        </span>
      ),
    },
    {
      key: "payload",
      label: "Max payload",
      render: (vehicle) => <span className="whitespace-nowrap">{formatNumber(vehicle.max_payload_lbs)} lbs</span>,
    },
    { key: "max_pallets", label: "Pallets" },
  ];

  if (canEdit) {
    columns.push({
      key: "actions",
      label: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (vehicle) => (
        <RowActions
          editHref={`/vehicles/${vehicle.id}/edit`}
          onDelete={() => askToDelete(vehicle)}
          label={vehicle.plate_number}
        />
      ),
    });
  }

  return (
    <div className="space-y-4">
      <Alert type={message?.type}>{message?.text}</Alert>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search plate, VIN, carrier…" />
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {vehicles.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No vehicles match "${search}".`} />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Delete this vehicle?"
        message={rowToDelete && `Vehicle ${rowToDelete.plate_number} will be permanently deleted.`}
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={() => confirmDelete(`Vehicle ${rowToDelete.plate_number} was deleted.`)}
      />
    </div>
  );
}
