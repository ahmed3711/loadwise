"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { SparkleIcon } from "@/components/icons";

// "Ask AI" box on the Matching page. The AI only explains the top 5
// loads; the ranking itself comes from the scoring rules.
export default function AiAdvicePanel({ vehicleId, aiReady, advice, onAdvice }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/match-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error || "The AI couldn't review these loads.");
      else onAdvice(data);
    } catch {
      setError("Network problem. Please try again.");
    }
    setLoading(false);
  }

  return (
    <section className="rounded-2xl bg-navy p-5 text-white shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <SparkleIcon className="h-5 w-5 text-brand" /> AI dispatch assistant
      </h2>
      <p className="mt-1 text-xs text-slate-300">
        Reviews the top 5 matches and explains them. It can&apos;t change the fit check or the scores, and you
        make the final call.
      </p>

      {!aiReady && (
        <p className="mt-3 rounded-lg bg-navy-light px-3 py-2 text-xs text-slate-300">
          AI is off: add <code className="text-brand">ANTHROPIC_API_KEY</code> to <code>.env.local</code> to turn it on.
        </p>
      )}

      <div className="mt-4">
        <Button onClick={ask} loading={loading} disabled={!aiReady} className="w-full">
          {loading ? "Reviewing…" : advice ? "Ask again" : "Review top 5 with AI"}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {advice && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-slate-100">{advice.summary}</p>
          {advice.cautions?.length > 0 && (
            <div className="rounded-lg bg-navy-light p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Double-check</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-200">
                {advice.cautions.map((caution) => (
                  <li key={caution}>{caution}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-400">The AI&apos;s verdict is shown on each load card.</p>
        </div>
      )}
    </section>
  );
}
