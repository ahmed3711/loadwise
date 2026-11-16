"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import ScoreBar from "./ScoreBar";
import { AlertIcon, ArrowRightIcon, CheckIcon, CpuIcon } from "@/components/icons";

// Multithreading on the Matching page:
// 1. Stability Check (worker-thread pool + shared memory)
// 2. Race condition demo (why synchronization is needed)
export default function ThreadsPanel({ request, ranked, result, onResult, canRun }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function runCheck() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/matching/stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Stability Check failed");
      onResult(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setRunning(false);
    }
  }

  // Loads ordered by how often they win, with their lane names
  const byId = new Map(ranked.map((item) => [item.load.id, item.load]));
  const winners = result
    ? result.loadIds
        .map((id, i) => ({ id, load: byId.get(id), wins: result.wins[i] }))
        .filter((row) => row.wins > 0 && row.load)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 5)
    : [];
  const topShare = result && ranked[0] ? sharesById(result).get(ranked[0].load.id) ?? 0 : 0;
  const speedUp = result && result.multiMs > 0 ? result.singleMs / result.multiMs : 0;

  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-brand">
            <CpuIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-navy">Stability Check · multithreaded</h2>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500">
              Is the #1 load still #1 if the weights change? This tries every weight mix in 0.05% steps
              (2,003,001 mixes) on a pool of worker threads and counts which load wins each time.
            </p>
          </div>
        </div>
        <Button onClick={runCheck} loading={running} disabled={!canRun} className="shrink-0">
          {result ? "Run again" : "Run Stability Check"}
        </Button>
      </div>

      {!canRun && (
        <p className="mt-4 text-sm text-slate-500">At least 2 loads must fit this vehicle to compare them.</p>
      )}
      {error && (
        <div className="mt-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* What it means for the dispatcher */}
          <div>
            <Verdict share={topShare} load={ranked[0]?.load} />
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Most often #1
            </h3>
            <ul className="space-y-2.5">
              {winners.map((row) => (
                <li key={row.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate text-navy">
                      {row.load.origin_city}
                      <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {row.load.destination_city}
                    </span>
                    <span className="font-mono text-xs text-slate-600">{((row.wins / result.total) * 100).toFixed(1)}%</span>
                  </div>
                  <ScoreBar value={row.wins / result.total} className="mt-1" />
                </li>
              ))}
            </ul>
          </div>

          {/* What the threads did */}
          <div className="rounded-xl bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Threads</h3>
            <div className="grid grid-cols-2 gap-3">
              <Tile label="One thread" value={`${result.singleMs} ms`} />
              <Tile label={`${result.threads} threads`} value={`${result.multiMs} ms`} highlight />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Speed-up <span className="font-semibold text-navy">{speedUp.toFixed(1)}×</span>
              {result.justStarted
                ? " · this run also had to start the threads, so press Run again for the real speed."
                : ` · threads reused from the pool (run #${result.poolRuns}).`}
            </p>

            <ul className="mt-4 space-y-1.5 text-sm">
              <Check ok={result.sharedCounter === result.total}>
                Shared counter (Atomics) = {formatNumber(result.sharedCounter)} of {formatNumber(result.total)}
              </Check>
              <Check ok={result.sameResult}>Same winners as the single-thread run</Check>
            </ul>

            <table className="mt-4 w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 font-medium">Thread</th>
                  <th className="py-1 text-right font-medium">Mixes</th>
                  <th className="py-1 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="text-navy">
                {result.perThread.map((thread) => (
                  <tr key={thread.threadId} className="border-t border-line">
                    <td className="py-1">#{thread.threadId}</td>
                    <td className="py-1 text-right font-mono">{formatNumber(thread.mixes)}</td>
                    <td className="py-1 text-right font-mono">{thread.ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RaceDemo />
    </section>
  );
}

function Verdict({ share, load }) {
  if (!load) return null;
  const percent = (share * 100).toFixed(1);
  const [tone, title] =
    share >= 0.5
      ? ["border-green-200 bg-green-50 text-green-800", "Safe pick"]
      : share >= 0.2
        ? ["border-brand/40 bg-brand-soft text-navy", "Depends on your priorities"]
        : ["border-red-200 bg-red-50 text-red-700", "Fragile pick"];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5">
        Your #1 ({load.origin_city} → {load.destination_city}) is the best load in {percent}% of all weight mixes.
      </p>
    </div>
  );
}

// Race condition demo: the same counter with and without synchronization
function RaceDemo() {
  const [running, setRunning] = useState(false);
  const [race, setRace] = useState(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/threads/race", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Race demo failed");
      setRace(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy">Why synchronization? Race condition demo</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Every thread adds 1 to the same shared counter a million times: once with a plain{" "}
            <code className="rounded bg-surface px-1">counter++</code> and once with{" "}
            <code className="rounded bg-surface px-1">Atomics.add()</code>.
          </p>
        </div>
        <Button variant="secondary" onClick={run} loading={running} className="shrink-0">
          Run race demo
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {race && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile label={`Expected (${race.threads} × ${formatNumber(race.times)})`} value={formatNumber(race.expected)} />
          <Tile
            label="Without synchronization"
            value={formatNumber(race.unsafe)}
            note={race.lost > 0 ? `${formatNumber(race.lost)} updates lost` : "No updates lost this time"}
            bad={race.lost > 0}
          />
          <Tile
            label="With Atomics.add()"
            value={formatNumber(race.safe)}
            note={race.safe === race.expected ? "Exactly right" : "Mismatch"}
            good={race.safe === race.expected}
          />
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, note, highlight = false, good = false, bad = false }) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${highlight ? "border-brand" : "border-line"}`}>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-navy">{value}</p>
      {note && (
        <p className={`text-xs font-medium ${bad ? "text-red-600" : good ? "text-green-700" : "text-slate-500"}`}>
          {note}
        </p>
      )}
    </div>
  );
}

function Check({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-green-700" : "text-red-600"}`}>
      {ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
      {children}
    </li>
  );
}

// Map(load id -> share of mixes won)
export function sharesById(result) {
  return new Map(result.loadIds.map((id, i) => [id, result.wins[i] / result.total]));
}
