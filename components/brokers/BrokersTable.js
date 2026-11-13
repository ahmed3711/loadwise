"use client";

import { useState } from "react";
import { brokerRisk, isStale, riskReason } from "@/lib/brokers/risk.mjs";
import { BROKER_STATUSES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import Table from "@/components/ui/Table";
import SearchBox from "@/components/ui/SearchBox";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import RiskBadge from "./RiskBadge";
import { ShieldIcon } from "@/components/icons";

export default function BrokersTable({ brokers }) {
  const [search, setSearch] = useState("");

  if (brokers.length === 0) {
    return (
      <EmptyState
        icon={<ShieldIcon className="h-6 w-6" />}
        title="No brokers checked yet"
        message="Check a broker by MC number above. Unchecked brokers count as 'Not verified' in the matching score."
      />
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = brokers.filter((b) =>
    [b.mc_number, b.legal_name, b.notes].join(" ").toLowerCase().includes(term)
  );

  const columns = [
    {
      key: "broker",
      label: "Broker",
      render: (b) => (
        <div>
          <p className="font-semibold">{b.legal_name || "—"}</p>
          <p className="text-xs text-slate-500">
            MC {b.mc_number}
            {b.dot_number ? ` · USDOT ${b.dot_number}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "risk",
      label: "Risk",
      render: (b) => (
        <div className="max-w-xs space-y-1">
          <RiskBadge risk={brokerRisk(b)} />
          <p className="text-xs text-slate-500">{riskReason(b)}</p>
        </div>
      ),
    },
    { key: "status", label: "Authority", render: (b) => labelFor(BROKER_STATUSES, b.authority_status) },
    { key: "granted", label: "Granted on", render: (b) => formatDate(b.authority_granted_on) },
    {
      key: "source",
      label: "Source",
      render: (b) => (
        <div className="space-y-1 whitespace-nowrap text-xs">
          <Badge color={b.source === "fmcsa" ? "blue" : "purple"}>{b.source === "fmcsa" ? "FMCSA" : "Manual"}</Badge>
          <p className="text-slate-500">
            {new Date(b.checked_at).toLocaleDateString("en-US")}
            {b.source === "fmcsa" && isStale(b.checked_at) ? " · older than 24 h" : ""}
          </p>
        </div>
      ),
    },
    { key: "notes", label: "Notes", render: (b) => <span className="text-xs text-slate-600">{b.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search MC, name, notes…" />
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {brokers.length}
        </p>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No matches" message={`No brokers match "${search}".`} />
      ) : (
        <Table columns={columns} rows={filtered.map((b) => ({ ...b, id: b.mc_number }))} />
      )}
    </div>
  );
}
