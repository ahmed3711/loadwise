"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { formatNumber } from "@/lib/format";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Table from "@/components/ui/Table";
import { BeakerIcon, CheckIcon } from "@/components/icons";

const pct = (value) => `${(value * 100).toFixed(1)}%`;
const weightText = (w) => `${w.rpm} / ${w.deadhead} / ${w.lane} / ${w.broker}`;

// Runs the Weight Lab and shows the results + the multithreading numbers
export default function WeightLab({ carrier, currentWeights, threads }) {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(null);

  async function run() {
    setRunning(true);
    setError("");
    setApplied(null);
    try {
      const response = await fetch("/api/matching/weight-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierId: carrier.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error || "The Weight Lab couldn't run.");
      else setResult(data);
    } catch {
      setError("Network problem. Please try again.");
    }
    setRunning(false);
  }

  async function apply(weights) {
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("carriers")
      .update({
        weight_rpm: weights.rpm,
        weight_deadhead: weights.deadhead,
        weight_lane: weights.lane,
        weight_broker: weights.broker,
      })
      .eq("id", carrier.id)
      .select("id");
    if (dbError) return setError(friendlyDbError(dbError));
    if (!data?.length) return setError("You don't have permission to change this carrier.");
    setApplied(weightText(weights));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-navy">How it works</h2>
            <p className="mt-1 text-sm text-slate-600">
              For each past booking of <strong>{carrier.company_name}</strong>, LoadWise looks at the other loads that
              fitted the same vehicle within 3 days of its pickup. A good weight set scores the load you booked higher
              than the ones you passed on. Every weight set in 1% steps (176,851 of them) is tested, split across{" "}
              <strong>{threads} worker threads</strong>.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Current weights (rate / empty miles / lanes / broker): {weightText(currentWeights)}
            </p>
          </div>
          <Button onClick={run} loading={running} className="shrink-0">
            <BeakerIcon className="h-4 w-4" />
            {running ? "Testing weight sets…" : result ? "Run again" : "Run Weight Lab"}
          </Button>
        </div>
      </section>

      <Alert type="error">{error}</Alert>
      {applied && <Alert type="success">New weights {applied} saved for {carrier.company_name}.</Alert>}

      {result && !result.enoughData && (
        <Alert type="info">
          Not enough history yet: {result.bookingCount} booking(s) gave {result.pairCount} comparison(s), and at least
          10 are needed. Book more loads (or load the demo data) and try again.
        </Alert>
      )}

      {result?.enoughData && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Bookings used" value={formatNumber(result.bookingCount)} />
            <Stat label="Comparisons" value={formatNumber(result.pairCount)} />
            <Stat label="Current weights agree" value={pct(result.current.agreement)} />
            <Stat label="Best weights agree" value={pct(result.best[0]?.agreement ?? 0)} highlight />
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-navy">Best weight sets</h2>
            <Table
              columns={[
                { key: "rank", label: "#", render: (row) => row.rank },
                { key: "rpm", label: "Net rate/mile", render: (row) => `${row.weights.rpm}%` },
                { key: "deadhead", label: "Empty miles", render: (row) => `${row.weights.deadhead}%` },
                { key: "lane", label: "Lanes", render: (row) => `${row.weights.lane}%` },
                { key: "broker", label: "Broker", render: (row) => `${row.weights.broker}%` },
                {
                  key: "agreement",
                  label: "Agreement",
                  render: (row) => <span className="font-semibold">{pct(row.agreement)}</span>,
                },
                {
                  key: "apply",
                  label: <span className="sr-only">Apply</span>,
                  className: "text-right",
                  render: (row) =>
                    row.fixed ? (
                      <span className="text-xs text-slate-400">{row.fixed}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => apply(row.weights)}
                        className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-brand hover:bg-brand-soft"
                      >
                        Use these
                      </button>
                    ),
                },
              ]}
              rows={[
                ...result.best.map((item, index) => ({ id: `best-${index}`, rank: index + 1, ...item })),
                { id: "current", rank: "Now", ...result.current, fixed: "current" },
                { id: "default", rank: "Default", ...result.defaults, fixed: "proposal default" },
              ]}
            />
            <p className="text-xs text-slate-500">
              Agreement = how often the weights rank the booked load above a load you passed on (a tie counts half).
              Treat it as a guide: with few bookings the best set can over-fit, so check the ranking still looks
              sensible.
            </p>
          </section>

          {/* Multithreading results */}
          <section className="rounded-2xl bg-navy p-6 text-white">
            <h2 className="text-lg font-semibold">Multithreading</h2>
            <p className="mt-1 text-sm text-slate-300">
              The weight sets were split into {result.threads} equal parts. Each part ran on its own Node.js worker
              thread at the same time, and the main thread waited for all of them and merged their best results.
              The threads stay running between runs (a thread pool), so they don&apos;t have to start again.
            </p>
            {result.poolStarted && (
              <p className="mt-3 rounded-lg bg-brand/15 px-3 py-2 text-sm text-brand">
                This first run also had to start the {result.threads} threads, which takes longer than the work
                itself. Click <strong>Run again</strong> to see the speed of the ready thread pool.
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DarkStat label="Worker threads" value={result.threads} />
              <DarkStat label="Multi-threaded time" value={`${formatNumber(result.multiMs)} ms`} />
              <DarkStat label="Single-thread time" value={`${formatNumber(result.singleMs)} ms`} />
              <DarkStat
                label="Speed-up"
                value={result.multiMs > 0 ? `${(result.singleMs / result.multiMs).toFixed(1)}×` : "—"}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Why not {result.threads}× faster? Splitting the work, sending it to the threads and merging the results
              takes time that can&apos;t run in parallel (Amdahl&apos;s law). The more booking history there is, the
              bigger the share of parallel work and the bigger the speed-up.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-navy-light p-4">
                <p className="text-sm font-semibold">Work per thread</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {result.perThread.map((thread) => (
                    <li key={thread.threadId} className="flex justify-between">
                      <span>Thread {thread.threadId}</span>
                      <span>
                        {formatNumber(thread.evaluated)} sets · {formatNumber(thread.ms)} ms
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3 rounded-xl bg-navy-light p-4 text-sm">
                <p className="font-semibold">Synchronization checks</p>
                <Check ok={result.sharedCounter === result.total}>
                  Shared counter (SharedArrayBuffer + Atomics.add) = {formatNumber(result.sharedCounter)} of{" "}
                  {formatNumber(result.total)}: no updates lost between threads
                </Check>
                <Check ok={result.sameWinner}>
                  Multi-threaded and single-thread runs found the same best weights
                </Check>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${highlight ? "border-brand" : "border-line"}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
    </div>
  );
}

function DarkStat({ label, value }) {
  return (
    <div className="rounded-xl bg-navy-light p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand">{value}</p>
    </div>
  );
}

function Check({ ok, children }) {
  return (
    <p className="flex items-start gap-2 text-slate-200">
      <span className={`mt-0.5 rounded-full p-0.5 ${ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
        <CheckIcon className="h-3 w-3" />
      </span>
      <span>
        {children} {!ok && <Badge color="red">check failed</Badge>}
      </span>
    </p>
  );
}
