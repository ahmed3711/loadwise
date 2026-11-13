"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { brokerRisk, riskReason } from "@/lib/brokers/risk.mjs";
import { manualBrokerSchema, brokerToForm } from "@/lib/validation/broker";
import { BROKER_STATUSES, labelFor } from "@/lib/constants";
import { todayString } from "@/lib/format";
import Card from "@/components/ui/Card";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import RiskBadge from "./RiskBadge";
import { SearchIcon, ShieldIcon } from "@/components/icons";

const ORIGIN_LABELS = {
  fmcsa: { color: "green", text: "Live from FMCSA" },
  cache: { color: "blue", text: "Saved result (cached)" },
  "stale-cache": { color: "amber", text: "Older saved result (FMCSA unavailable)" },
  none: { color: "slate", text: "No record yet" },
};

// MC lookup + manual verification form
export default function BrokerCheck({ initialMc, fmcsaReady, unchecked }) {
  const router = useRouter();
  const [mc, setMc] = useState(initialMc);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { broker, origin, message }
  const [error, setError] = useState("");

  async function check(mcNumber = mc, refresh = false) {
    const clean = String(mcNumber).replace(/\D/g, "");
    setMc(clean);
    if (!/^[0-9]{6,8}$/.test(clean)) {
      setError("MC number must be 6–8 digits (numbers only).");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/brokers/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mc: clean, refresh }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error || "Could not check this broker.");
      else {
        setResult({ ...data, mc: clean });
        router.refresh();
      }
    } catch {
      setError("Network problem. Please try again.");
    }
    setChecking(false);
  }

  // Opened from the "Book" pop-up with ?mc=...
  useEffect(() => {
    if (!initialMc) return;
    const timer = setTimeout(() => check(initialMc), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMc]);

  const broker = result?.broker ?? null;
  const risk = brokerRisk(broker);
  const origin = ORIGIN_LABELS[result?.origin] ?? ORIGIN_LABELS.none;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          <ShieldIcon className="h-5 w-5 text-brand" /> Check by MC number
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {fmcsaReady
            ? "Looks up the broker's authority with FMCSA. Results are reused for 24 hours."
            : "FMCSA lookup is off (no FMCSA_WEB_KEY). You can still record a broker check by hand."}
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            check();
          }}
        >
          <input
            value={mc}
            onChange={(event) => setMc(event.target.value)}
            inputMode="numeric"
            maxLength={8}
            placeholder="MC number, e.g. 411443"
            aria-label="Broker MC number"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <Button type="submit" loading={checking}>
            <SearchIcon className="h-4 w-4" /> Check
          </Button>
        </form>

        <div className="mt-4 space-y-3">
          <Alert type="error">{error}</Alert>
          {result?.message && <Alert type="info">{result.message}</Alert>}

          {result && (
            <div className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy">
                  {broker?.legal_name || "Broker"} · MC {result.mc}
                </p>
                <RiskBadge risk={risk} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{riskReason(broker)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge color={origin.color}>{origin.text}</Badge>
                {broker && (
                  <>
                    <span>Status: {labelFor(BROKER_STATUSES, broker.authority_status)}</span>
                    <span>· Source: {broker.source === "fmcsa" ? "FMCSA" : "Manual check"}</span>
                    <span>· Checked {new Date(broker.checked_at).toLocaleString("en-US")}</span>
                  </>
                )}
              </div>
              {fmcsaReady && broker?.source === "fmcsa" && (
                <button
                  type="button"
                  onClick={() => check(result.mc, true)}
                  className="mt-3 text-xs font-semibold text-navy underline-offset-2 hover:underline"
                >
                  Ask FMCSA again now
                </button>
              )}
            </div>
          )}

          {unchecked.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Brokers on your loads not checked yet
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unchecked.slice(0, 12).map((item) => (
                  <button
                    key={item.mc}
                    type="button"
                    onClick={() => check(item.mc)}
                    className="rounded-full border border-line px-3 py-1 text-xs font-medium text-navy transition hover:border-brand hover:bg-brand-soft"
                  >
                    {item.name} · {item.mc}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {result && <ManualCheckForm key={`${result.mc}-${broker?.checked_at ?? "new"}`} mc={result.mc} broker={broker} />}
    </div>
  );
}

// Record (or correct) a broker check by hand, e.g. after looking the
// broker up on the FMCSA website or calling them.
function ManualCheckForm({ mc, broker }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(manualBrokerSchema),
    mode: "onTouched",
    defaultValues: brokerToForm(broker),
  });

  async function onSubmit(values) {
    setServerError("");
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase.from("brokers").upsert({
      mc_number: mc,
      ...values,
      source: "manual",
      checked_at: new Date().toISOString(),
    });
    if (error) return setServerError(friendlyDbError(error));
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormSection
          title={broker ? "Update this broker check" : "Record a manual check"}
          description="Use this when FMCSA is off or when you know the authority start date."
        >
          <Input
            id="legal_name"
            label="Broker legal name"
            placeholder="e.g. Summit Freight Brokers LLC"
            maxLength={200}
            className="sm:col-span-2"
            error={errors.legal_name?.message}
            {...register("legal_name")}
          />
          <Select
            id="authority_status"
            label="Authority status"
            options={BROKER_STATUSES}
            placeholder="Choose status"
            required
            error={errors.authority_status?.message}
            {...register("authority_status")}
          />
          <Input
            id="authority_granted_on"
            label="Authority granted on"
            type="date"
            max={todayString()}
            hint="Less than 12 months ago = high risk."
            error={errors.authority_granted_on?.message}
            {...register("authority_granted_on")}
          />
          <Input
            id="notes"
            label="Notes"
            placeholder="e.g. Verified by phone, credit score 92"
            maxLength={300}
            className="sm:col-span-2"
            error={errors.notes?.message}
            {...register("notes")}
          />
        </FormSection>
        <Alert type="error">{serverError}</Alert>
        {saved && <Alert type="success">Broker check saved.</Alert>}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" loading={isSubmitting}>
            Save check
          </Button>
        </div>
      </form>
    </Card>
  );
}
