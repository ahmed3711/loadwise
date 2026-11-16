"use client";

import { PART_COLORS, SHORT_LABELS } from "./ScoreBar";

// The four ranking modes as clickable cards
export default function RankingModePicker({ modes, selectedId, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {modes.map((mode) => {
        const selected = mode.id === selectedId;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            aria-pressed={selected}
            className={`rounded-xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
              selected ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-navy">{mode.name}</span>
              {selected && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                  Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{mode.description}</p>

            {/* The weights as one stacked bar */}
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface">
              {Object.entries(mode.weights).map(([part, weight]) => (
                <div key={part} className={PART_COLORS[part]} style={{ width: `${weight}%` }} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {Object.entries(mode.weights)
                .map(([part, weight]) => `${SHORT_LABELS[part]} ${weight}%`)
                .join(" · ")}
            </p>
          </button>
        );
      })}
    </div>
  );
}
