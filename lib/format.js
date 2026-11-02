// Small helpers to show numbers, money and dates nicely in tables.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 1850 -> "$1,850.00"
export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

// 42000 -> "42,000"
export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value));
}

// "5551234567" -> "(555) 123-4567"
export function formatPhone(phone) {
  if (!phone || phone.length !== 10) return phone || "—";
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
}

// "2026-11-05" -> "Nov 5, 2026"
export function formatDate(isoDate) {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// Today's date in the user's own time zone, as "YYYY-MM-DD"
export function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Adds days to today and returns "YYYY-MM-DD" (used for the sample CSV)
export function dateFromToday(daysToAdd) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
