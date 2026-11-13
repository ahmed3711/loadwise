// Broker risk rules (FR-11). Same rules as public.broker_risk() in
// supabase/schema-part2.sql, so the page and the database always agree.
//
//   high    = authority inactive / not found, or less than 12 months old
//   low     = active and at least 12 months old
//   unknown = never checked, or the authority start date isn't known yet

export const RISK_LABELS = {
  low: "Low risk",
  high: "High risk",
  unknown: "Not verified",
};

// Results from FMCSA are reused for 24 hours (NFR-04)
export const CACHE_HOURS = 24;

export function brokerRisk(broker, today = new Date()) {
  if (!broker) return "unknown";
  if (broker.authority_status !== "active") return "high";
  if (!broker.authority_granted_on) return "unknown";
  return monthsBetween(broker.authority_granted_on, today) < 12 ? "high" : "low";
}

// Plain-English reason for the risk level
export function riskReason(broker, today = new Date()) {
  if (!broker) return "This broker hasn't been checked yet.";
  if (broker.authority_status === "not_found") return "No operating authority found for this MC number.";
  if (broker.authority_status === "inactive") return "Operating authority is inactive.";
  if (!broker.authority_granted_on) return "Authority is active, but its start date isn't recorded.";
  const months = monthsBetween(broker.authority_granted_on, today);
  return months < 12
    ? `Authority is only ${months} month${months === 1 ? "" : "s"} old (less than 12).`
    : `Authority active for ${Math.floor(months / 12)}+ year${months >= 24 ? "s" : ""}.`;
}

// Is a saved FMCSA result older than 24 hours?
export function isStale(checkedAt, now = new Date()) {
  if (!checkedAt) return true;
  return now.getTime() - new Date(checkedAt).getTime() > CACHE_HOURS * 60 * 60 * 1000;
}

// Whole months from an ISO date ("2025-06-01") to today
export function monthsBetween(isoDate, today = new Date()) {
  const [year, month, day] = String(isoDate).slice(0, 10).split("-").map(Number);
  let months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;
  return Math.max(0, months);
}
