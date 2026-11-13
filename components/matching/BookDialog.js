"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { riskReason } from "@/lib/brokers/risk.mjs";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import LinkButton from "@/components/ui/LinkButton";
import RiskBadge from "@/components/brokers/RiskBadge";
import { AlertIcon } from "@/components/icons";

// "Book this load" pop-up with the broker risk gate (FR-12):
// a high-risk or unverified broker needs a ticked confirmation box.
// (The parent gives it a new "key" per load, so it starts fresh each time.)
export default function BookDialog({ item, vehicleId, broker, onClose }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!item) return null;
  const { load } = item;
  const risky = item.brokerRisk !== "low";

  async function book() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId: load.id, vehicleId, confirmRisk: risky && confirmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not book this load.");
        setSaving(false);
        return;
      }
      router.push("/bookings?success=booked");
      router.refresh();
    } catch {
      setError("Network problem. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Book this load?"
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={book} loading={saving} disabled={risky && !confirmed}>
            {saving ? "Booking…" : risky ? "Confirm and book" : "Book load"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert type="error">{error}</Alert>

        <div>
          <p className="font-semibold text-navy">
            {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
          </p>
          <p className="text-sm text-slate-500">
            Pickup {formatDate(load.pickup_date)} · Delivery {formatDate(load.delivery_date)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Rate" value={formatMoney(load.rate_usd)} />
          <Row label="Score" value={`${item.score} / 100`} />
          <Row label="Empty miles to pickup" value={formatNumber(item.deadheadMiles)} />
          <Row label="Net rate per mile" value={formatMoney(item.netRpm)} />
        </dl>

        <div className="rounded-xl border border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-navy">
              {load.broker_name} · MC {load.broker_mc}
            </p>
            <RiskBadge risk={item.brokerRisk} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{riskReason(broker)}</p>
        </div>

        {risky && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertIcon className="h-4 w-4" />
              Check this broker before booking
            </p>
            <p className="mt-1 text-sm text-red-700">
              Booking with an inactive, very new or unverified broker can mean unpaid freight or stolen cargo.
            </p>
            <label className="mt-3 flex items-start gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line accent-brand"
              />
              I have verified this broker (MC number, contact and rate confirmation) and want to book anyway.
            </label>
            <div className="mt-3">
              <LinkButton href={`/brokers?mc=${load.broker_mc}`} variant="secondary">
                Open Broker Check
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}
