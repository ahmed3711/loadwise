"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { SparkleIcon } from "@/components/icons";

const EXAMPLE = `Load available 🚚 Dallas, TX ➜ Chicago, IL
PU tomorrow 8am, DEL in 2 days
26' box truck, 8 pallets, 9,500 lbs, 18 ft of floor
$2,150 all in, 925 mi
Broker: Summit Freight Brokers MC# 411443`;

// "Paste a load and let AI fill the form". The AI only fills the fields;
// the normal form rules still check everything before it can be saved.
export default function AiPasteLoad({ aiReady, onFill }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { filled, notes }

  async function readLoad() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ai/parse-load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The AI couldn't read this load.");
      } else {
        const filled = onFill(data);
        setResult({ filled, notes: data.notes ?? [] });
      }
    } catch {
      setError("Network problem. Please try again.");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand/50 bg-brand-soft/60 px-4 py-3 text-left transition hover:border-brand"
      >
        <SparkleIcon className="h-5 w-5 shrink-0 text-navy" />
        <span>
          <span className="block text-sm font-semibold text-navy">Paste a load and let AI fill the form</span>
          <span className="block text-xs text-slate-600">
            From an email, WhatsApp message or load board. You check everything before saving.
          </span>
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-brand/50 bg-brand-soft/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <SparkleIcon className="h-5 w-5" /> Fill with AI
        </h2>
        <button
          type="button"
          onClick={() => setText(EXAMPLE)}
          className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
        >
          Use an example
        </button>
      </div>

      {!aiReady && (
        <p className="mt-2 text-xs text-slate-600">
          AI is off: add <code>ANTHROPIC_API_KEY</code> to <code>.env.local</code> to use this.
        </p>
      )}

      <label htmlFor="ai-load-text" className="sr-only">
        Load text
      </label>
      <textarea
        id="ai-load-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        maxLength={4000}
        placeholder="Paste the load details here…"
        className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={readLoad} loading={loading} disabled={!aiReady || text.trim().length < 20}>
          {loading ? "Reading…" : "Fill the form"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
        <span className="text-xs text-slate-500">{text.length} / 4000</span>
      </div>

      <div className="mt-3 space-y-2">
        <Alert type="error">{error}</Alert>
        {result && (
          <Alert type="success">
            AI filled {result.filled} field{result.filled === 1 ? "" : "s"}. Please check them, and complete any
            empty ones, before saving.
            {result.notes.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}
      </div>
    </section>
  );
}
