"use client";

import { useState } from "react";
import { useDeleteRow } from "@/lib/use-delete-row";
import { formatMoney, formatPhone } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import RowActions from "@/components/ui/RowActions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LinkButton from "@/components/ui/LinkButton";
import { BuildingIcon } from "@/components/icons";

// Table of carriers with search, edit and delete
export default function CarriersTable({ carriers, canEdit }) {
  const [search, setSearch] = useState("");
  const { rowToDelete, askToDelete, cancelDelete, confirmDelete, deleting, message } =
    useDeleteRow("carriers");

  if (carriers.length === 0) {
    return (
      <>
        <Alert type={message?.type}>{message?.text}</Alert>
        <EmptyState
          icon={<BuildingIcon className="h-6 w-6" />}
          title="No carriers yet"
          message={
            canEdit
              ? "Add your first carrier to store its vehicle limits and preferences."
              : "Carriers added by dispatchers will appear here."
          }
          action={canEdit && <LinkButton href="/carriers/new">+ Add your first carrier</LinkButton>}
        />
      </>
    );
  }

  // Keep only rows that contain the search text
  const term = search.trim().toLowerCase();
  const filtered = carriers.filter((carrier) =>
    [carrier.company_name, carrier.mc_number, carrier.dot_number, carrier.home_city, carrier.home_state]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );

  const columns = [
    {
      key: "company",
      label: "Company",
      render: (carrier) => (
        <div>
          <p className="font-semibold">{carrier.company_name}</p>
          <p className="text-xs text-slate-500">
            {carrier.contact_email} · {formatPhone(carrier.contact_phone)}
          </p>
        </div>
      ),
    },
    {
      key: "numbers",
      label: "MC / USDOT",
      render: (carrier) => (
        <div className="whitespace-nowrap text-xs">
          <p>MC {carrier.mc_number}</p>
          <p className="text-slate-500">DOT {carrier.dot_number}</p>
        </div>
      ),
    },
    {
      key: "home",
      label: "Home base",
      render: (carrier) => (
        <span className="whitespace-nowrap">
          {carrier.home_city}, {carrier.home_state} {carrier.zip_code}
        </span>
      ),
    },
    {
      key: "preferred",
      label: "Preferred states",
      render: (carrier) => {
        const states = carrier.preferred_states ?? [];
        if (states.length === 0) return <span className="text-slate-400">Any</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {states.slice(0, 4).map((code) => (
              <Badge key={code} color="amber">
                {code}
              </Badge>
            ))}
            {states.length > 4 && <Badge>+{states.length - 4}</Badge>}
          </div>
        );
      },
    },
    {
      key: "rate",
      label: "Min / mile",
      render: (carrier) => formatMoney(carrier.min_rate_per_mile),
    },
    {
      key: "vehicles",
      label: "Vehicles",
      render: (carrier) => carrier.vehicles?.[0]?.count ?? 0,
    },
  ];

  if (canEdit) {
    columns.push({
      key: "actions",
      label: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (carrier) => (
        <RowActions
          editHref={`/carriers/${carrier.id}/edit`}
          onDelete={() => askToDelete(carrier)}
          label={carrier.company_name}
        />
      ),
    });
  }

  return (
    <div className="space-y-4">
      <Alert type={message?.type}>{message?.text}</Alert>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, MC, DOT, city…" />
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {carriers.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No carriers match "${search}".`} />
      ) : (
        <Table columns={columns} rows={filtered} />
      )}

      <ConfirmDialog
        open={Boolean(rowToDelete)}
        title="Delete this carrier?"
        message={
          rowToDelete &&
          `"${rowToDelete.company_name}" and all of its ${rowToDelete.vehicles?.[0]?.count ?? 0} vehicle(s) will be permanently deleted.`
        }
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={() => confirmDelete(`"${rowToDelete.company_name}" was deleted.`)}
      />
    </div>
  );
}
