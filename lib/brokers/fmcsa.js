import "server-only";

// FMCSA QCMobile API: public broker/carrier authority data (FR-10).
// Needs a free "webKey" from https://mobile.fmcsa.dot.gov/QCDevsite/
// saved as FMCSA_WEB_KEY in .env.local (server only).

const BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services";

export function fmcsaConfigured() {
  return Boolean(process.env.FMCSA_WEB_KEY);
}

// Returns a row ready to save in the brokers table
export async function lookupBrokerByMc(mc) {
  const key = encodeURIComponent(process.env.FMCSA_WEB_KEY);

  const docket = await getJson(`${BASE_URL}/carriers/docket-number/${mc}?webKey=${key}`);
  const carrier = firstCarrier(docket);

  if (!carrier) {
    return {
      mc_number: mc,
      legal_name: null,
      dot_number: null,
      authority_status: "not_found",
      authority_granted_on: null,
      source: "fmcsa",
    };
  }

  const dot = carrier.dotNumber ? String(carrier.dotNumber) : null;
  let active = carrier.allowedToOperate === "Y";

  // Broker authority status: "A" = active
  if (dot) {
    try {
      const authority = await getJson(`${BASE_URL}/carriers/${dot}/authority?webKey=${key}`);
      const records = asArray(authority?.content).map((item) => item?.carrierAuthority ?? item);
      const brokerRecord = records.find((r) => r?.brokerAuthorityStatus);
      if (brokerRecord) active = active && brokerRecord.brokerAuthorityStatus === "A";
    } catch {
      // Keep the result from the first request if this one fails
    }
  }

  return {
    mc_number: mc,
    legal_name: carrier.legalName ? String(carrier.legalName).slice(0, 200) : null,
    dot_number: dot && /^[0-9]{1,8}$/.test(dot) ? dot : null,
    authority_status: active ? "active" : "inactive",
    // QCMobile doesn't return the date authority was granted, so it stays
    // empty (risk "Not verified") until the dispatcher records it.
    authority_granted_on: null,
    source: "fmcsa",
  };
}

function firstCarrier(data) {
  const content = asArray(data?.content);
  const first = content[0];
  return first?.carrier ?? first ?? null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`FMCSA returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
