import { chainNames } from "@/lib/matching/fit-checks.mjs";
import { ArrowRightIcon } from "@/components/icons";

// Loads removed by the fit chain (Chain of Responsibility), with the reasons (FR-05)
export default function ExcludedLoads({ excluded }) {
  if (excluded.length === 0) return null;
  const checks = chainNames();

  return (
    <details className="group rounded-2xl border border-line bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm font-semibold text-navy">
        <span>
          Left out by the fit chain{" "}
          <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs text-slate-600">{excluded.length}</span>
        </span>
        <span className="text-xs font-medium text-slate-500 group-open:hidden">Show reasons</span>
        <span className="hidden text-xs font-medium text-slate-500 group-open:inline">Hide</span>
      </summary>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface px-5 py-3 text-xs text-slate-500">
        <span className="mr-1">Every load passes through the fit chain:</span>
        {checks.map((name, index) => (
          <span key={name} className="flex items-center gap-1.5">
            {index > 0 && <ArrowRightIcon className="h-3 w-3 text-slate-400" />}
            <span className="rounded-md border border-line bg-white px-2 py-0.5 font-medium text-navy">{name}</span>
          </span>
        ))}
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {excluded.map(({ load, reasons }) => (
          <li key={load.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5 text-sm text-navy">
              {load.origin_city}, {load.origin_state}
              <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
              {load.destination_city}, {load.destination_state}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <span key={reason} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {reason}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
