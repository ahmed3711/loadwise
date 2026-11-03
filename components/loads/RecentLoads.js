"use client";

import { useState } from "react";
import Link from "next/link";
import { EQUIPMENT_TYPES, LOAD_STATUSES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import LinkButton from "@/components/ui/LinkButton";
import StatusBadge from "./StatusBadge";
import { BoxIcon } from "@/components/icons";

// "Recent loads" on the dashboard, with the same search as the Loads page.
// Empty search  -> shows the 5 newest loads.
// Typing a word -> searches ALL loads and shows every match.
export default function RecentLoads({ loads, isManager }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  // Same search fields as the Loads page: city, state, broker, equipment, status
  const matches = loads.filter((load) =>
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

  const rowsToShow = term ? matches : loads.slice(0, 5);

  const columns = [
    {
      key: "lane",
      label: "Lane",
      render: (load) => (
        <span className="whitespace-nowrap font-medium">
          {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
        </span>
      ),
    },
    { key: "pickup_date", label: "Pickup", render: (load) => formatDate(load.pickup_date) },
    { key: "equipment_type", label: "Equipment", render: (load) => labelFor(EQUIPMENT_TYPES, load.equipment_type) },
    { key: "weight_lbs", label: "Weight", render: (load) => `${formatNumber(load.weight_lbs)} lbs` },
    { key: "rate_usd", label: "Rate", render: (load) => formatMoney(load.rate_usd) },
    { key: "broker", label: "Broker", render: (load) => load.broker_name },
    { key: "status", label: "Status", render: (load) => <StatusBadge status={load.status} /> },
  ];

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-navy">
          {term ? `Search results (${matches.length})` : "Recent loads"}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {loads.length > 0 && (
            <SearchBox value={search} onChange={setSearch} placeholder="Search loads: city, state, broker…" />
          )}
          <Link
            href="/loads"
            className="whitespace-nowrap text-sm font-semibold text-navy underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
          >
            View all loads →
          </Link>
        </div>
      </div>

      {loads.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="h-6 w-6" />}
          title="No loads yet"
          message={
            isManager
              ? "Add your first load with the form, or upload many at once with a CSV file."
              : "Loads added by dispatchers will appear here."
          }
          action={isManager && <LinkButton href="/loads/new">+ Add your first load</LinkButton>}
        />
      ) : rowsToShow.length === 0 ? (
        <EmptyState title="No matches" message={`No loads match "${search}".`} />
      ) : (
        <Table columns={columns} rows={rowsToShow} />
      )}
    </section>
  );
}