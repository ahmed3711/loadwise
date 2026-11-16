"use client";

import { useState } from "react";
import { EQUIPMENT_TYPES, labelFor } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { explainScore } from "@/lib/matching/ranking-modes.mjs";
import Badge from "@/components/ui/Badge";
import ScoreBar, { PART_COLORS, PART_LABELS, scoreColor } from "./ScoreBar";
import { ArrowRightIcon, ChevronDownIcon } from "@/components/icons";

// One ranked load: lane, key numbers, score and "Why this score?"
export default function RankedLoadCard({ item, rank, mode, winShare }) {
  const [open, setOpen] = useState(false);
  const { load, score, netRpm, deadheadMiles, emptyShare, belowMinimum, parts } = item;
  const colors = scoreColor(score);
  const isTop = rank === 1;
  const preferredLane = parts.lane === 1;

  return (
    <li
      className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
        isTop ? "border-brand ring-2 ring-brand/30" : "border-line"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Rank */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isTop ? "bg-brand text-navy" : "bg-surface text-slate-600"
          }`}
        >
          #{rank}
        </div>

        {/* Lane and details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-navy">
            <span>
              {load.origin_city}, {load.origin_state}
            </span>
            <ArrowRightIcon className="h-4 w-4 text-slate-400" />
            <span>
              {load.destination_city}, {load.destination_state}
            </span>
            {isTop && <Badge color="amber">Best match</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Pickup {formatDate(load.pickup_date)} · {labelFor(EQUIPMENT_TYPES, load.equipment_type)} ·{" "}
            {formatNumber(load.weight_lbs)} lbs · {load.pallet_count} pallets · {load.broker_name}
          </p>

          {/* Key numbers */}
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Rate" value={formatMoney(load.rate_usd)} />
            <Stat label="Loaded miles" value={formatNumber(load.loaded_miles)} />
            <Stat
              label="Empty miles"
              value={`${formatNumber(deadheadMiles)} (${Math.round(emptyShare * 100)}%)`}
              warn={emptyShare > 0.2}
            />
            <Stat label="Net rate / mile" value={`${formatMoney(netRpm)}`} warn={belowMinimum} />
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            {preferredLane && <Badge color="green">Preferred lane both ways</Badge>}
            {belowMinimum && <Badge color="red">Below carrier minimum</Badge>}
            {winShare != null && (
              <Badge color={winShare >= 0.5 ? "green" : winShare > 0 ? "blue" : "slate"}>
                #1 in {(winShare * 100).toFixed(1)}% of weight mixes
              </Badge>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 bg-white ${colors.ring}`}
          >
            <span className="text-xl font-bold leading-none">{score}</span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-navy"
          >
            Why this score?
            <ChevronDownIcon className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Score breakdown: points = part (0-1) x weight */}
      {open && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          <p className="mb-3 text-xs text-slate-500">
            Ranking mode <span className="font-semibold text-navy">{mode.name}</span>: each part scores 0 to 1 and
            is multiplied by its weight.
          </p>
          <ul className="space-y-2.5">
            {explainScore(parts, mode.weights).map((row) => (
              <li key={row.part} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-navy">{PART_LABELS[row.part]}</span>
                <span className="text-right font-mono text-xs text-slate-600">
                  {row.value.toFixed(2)} × {row.weight} = <span className="font-semibold text-navy">{row.points}</span>
                </span>
                <ScoreBar value={row.value} color={PART_COLORS[row.part]} className="col-span-2 bg-white" />
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2 text-right text-sm font-semibold text-navy">
            Total: {score} / 100
          </p>
        </div>
      )}
    </li>
  );
}

function Stat({ label, value, warn = false }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`font-semibold ${warn ? "text-red-600" : "text-navy"}`}>{value}</dd>
    </div>
  );
}
