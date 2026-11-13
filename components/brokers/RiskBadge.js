import Badge from "@/components/ui/Badge";
import { RISK_LABELS } from "@/lib/brokers/risk.mjs";

// Coloured badge for a broker's risk level (FR-11)
const COLORS = { low: "green", high: "red", unknown: "amber" };

export default function RiskBadge({ risk }) {
  const level = RISK_LABELS[risk] ? risk : "unknown";
  return <Badge color={COLORS[level]}>{RISK_LABELS[level]}</Badge>;
}
