"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { DEFAULT_WEIGHTS, WEIGHT_KEYS, weightsAreValid } from "@/lib/matching/scoring.mjs";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import LinkButton from "@/components/ui/LinkButton";

const LABELS = {
  rpm: "Net rate per mile",
  deadhead: "Low empty miles",
  lane: "Preferred lanes",
  broker: "Broker trust",
};

// Edit the score weights for one carrier (FR-09). They must add up to 100.
export default function WeightsCard({ carrier, weights }) {
  const router = useRouter();
  const [values, setValues] = useState(weights);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const total = WEIGHT_KEYS.reduce((sum, key) => sum + (Number(values[key]) || 0), 0);
  const changed = WEIGHT_KEYS.some((key) => Number(values[key]) !== weights[key]);

  function update(key, text) {
    const digits = text.replace(/\D/g, "").slice(0, 3);
    setValues((old) => ({ ...old, [key]: digits === "" ? "" : Number(digits) }));
    setMessage(null);
  }

  async function save() {
    const clean = Object.fromEntries(WEIGHT_KEYS.map((key) => [key, Number(values[key]) || 0]));
    if (!weightsAreValid(clean)) {
      setMessage({ type: "error", text: "Each weight is 0–100 and all four must add up to 100." });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("carriers")
      .update({
        weight_rpm: clean.rpm,
        weight_deadhead: clean.deadhead,
        weight_lane: clean.lane,
        weight_broker: clean.broker,
      })
      .eq("id", carrier.id)
      .select("id");
    setSaving(false);

    if (error) return setMessage({ type: "error", text: friendlyDbError(error) });
    if (!data?.length) return setMessage({ type: "error", text: "You don't have permission to change this carrier." });

    setMessage({ type: "success", text: "Weights saved. Loads re-ranked." });
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-navy">Score weights</h2>
      <p className="mt-0.5 text-xs text-slate-500">For {carrier.company_name}. Must add up to 100.</p>

      <div className="mt-4 space-y-3">
        {WEIGHT_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <label htmlFor={`weight-${key}`} className="text-sm text-navy">
              {LABELS[key]}
            </label>
            <div className="flex items-center gap-1">
              <input
                id={`weight-${key}`}
                inputMode="numeric"
                value={values[key]}
                onChange={(event) => update(key, event.target.value)}
                className="w-16 rounded-lg border border-line px-2 py-1.5 text-right text-sm text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        ))}
      </div>

      <p className={`mt-3 text-right text-sm font-semibold ${total === 100 ? "text-green-700" : "text-red-600"}`}>
        Total: {total}%
      </p>

      <div className="mt-3 space-y-3">
        <Alert type={message?.type}>{message?.text}</Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} loading={saving} disabled={!changed || total !== 100}>
            Save weights
          </Button>
          <Button variant="ghost" onClick={() => setValues({ ...DEFAULT_WEIGHTS })}>
            Use defaults
          </Button>
        </div>
        <LinkButton href={`/matching/weights?carrier=${carrier.id}`} variant="secondary" className="w-full">
          Find the best weights in the Weight Lab
        </LinkButton>
      </div>
    </section>
  );
}
