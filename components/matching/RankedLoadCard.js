"use client";

import { useState } from "react";
import { EQUIPMENT_TYPES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RiskBadge from "@/components/brokers/RiskBadge";
import ScoreBar, { ScoreBreakdown } from "./ScoreBar";
import { SparkleIcon } from "@/components/icons";

const VERDICT_STYLES = {
  recommended: { color: "green", label: "AI: recommended" },
  consider: { color: "amber", label: "AI: consider" },
  avoid: { color: "red", label: "AI: avoid" },
};

// One ranked load on the Matching page
export default function RankedLoadCard({ rank, item, weights, minRate, verdict, onBook }) {
  const [showWhy, setShowWhy] = useState(false);
  const { load } = item;

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
        rank === 1 ? "border-brand ring-1 ring-brand/40" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              rank === 1 ? "bg-brand text-navy" : "bg-surface text-navy"
            }`}
          >
            #{rank}
          </span>
          <div>
            <p className="font-semibold text-navy">
              {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(load.pickup_date)} → {formatDate(load.delivery_date)} ·{" "}
              {labelFor(EQUIPMENT_TYPES, load.equipment_type)} · {formatNumber(load.weight_lbs)} lbs ·{" "}
              {load.pallet_count} pallets · {load.length_ft} ft
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-600">
                {load.broker_name} · MC {load.broker_mc}
              </span>
              <RiskBadge risk={item.brokerRisk} />
              {verdict && (
                <Badge color={VERDICT_STYLES[verdict.verdict]?.color ?? "slate"}>
                  <SparkleIcon className="mr-1 h-3 w-3" />
                  {VERDICT_STYLES[verdict.verdict]?.label ?? verdict.verdict}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <ScoreBar score={item.score} size="lg" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Rate" value={formatMoney(load.rate_usd)} />
        <Metric label="Loaded / empty miles" value={`${formatNumber(load.loaded_miles)} / ${formatNumber(item.deadheadMiles)}`} />
        <Metric label="Empty miles" value={`${Math.round(item.emptyShare * 100)}%`} />
        <Metric
          label="Net rate per mile"
          value={formatMoney(item.netRpm)}
          warning={item.belowMinimum ? `Below minimum ${formatMoney(minRate)}` : null}
        />
      </dl>

      {verdict && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-navy">
          <SparkleIcon className="mr-1 inline h-4 w-4 align-text-bottom" />
          {verdict.reason}
        </p>
      )}

      {showWhy && (
        <div className="mt-4 rounded-xl border border-line p-4">
          <ScoreBreakdown components={item.components} weights={weights} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setShowWhy((value) => !value)}
          className="text-sm font-medium text-slate-500 transition hover:text-navy"
          aria-expanded={showWhy}
        >
          {showWhy ? "Hide score details" : "Why this score?"}
        </button>
        <Button onClick={onBook}>Book this load</Button>
      </div>
    </article>
  );
}

function Metric({ label, value, warning }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-semibold ${warning ? "text-red-600" : "text-navy"}`}>{value}</dd>
      {warning && <dd className="text-[11px] font-medium text-red-600">{warning}</dd>}
    </div>
  );
}
