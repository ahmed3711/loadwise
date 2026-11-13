import { formatDate, formatMoney } from "@/lib/format";

// Loads removed by the hard fit filter, with the reason (FR-05).
// Shown so the dispatcher can see the filter working.
export default function ExcludedLoads({ excluded }) {
  if (excluded.length === 0) return null;

  return (
    <details className="group rounded-2xl border border-line bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-navy">
        <span>
          {excluded.length} load{excluded.length === 1 ? "" : "s"} left out because they don&apos;t fit this vehicle
        </span>
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {excluded.map(({ load, reasons }) => (
          <li key={load.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-navy">
                {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
              </p>
              <p className="text-xs text-slate-500">
                Pickup {formatDate(load.pickup_date)} · {formatMoney(load.rate_usd)} · {load.broker_name}
              </p>
            </div>
            <ul className="flex flex-wrap gap-1.5 sm:justify-end">
              {reasons.map((reason) => (
                <li key={reason} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {reason}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
