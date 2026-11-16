// Thin progress bar, value from 0 to 1
export default function ScoreBar({ value, color = "bg-brand", className = "" }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${percent}%` }} />
    </div>
  );
}

// Colour for a 0-100 score
export function scoreColor(score) {
  if (score >= 75) return { ring: "border-green-500 text-green-700", bar: "bg-green-500" };
  if (score >= 50) return { ring: "border-brand text-navy", bar: "bg-brand" };
  return { ring: "border-slate-300 text-slate-500", bar: "bg-slate-400" };
}

export const PART_LABELS = {
  rpm: "Net rate per mile",
  deadhead: "Low empty miles",
  lane: "Preferred lanes",
};

// Short names, with the same colours as the ranking mode weight bar
export const SHORT_LABELS = { rpm: "Rate", deadhead: "Empty miles", lane: "Lanes" };
export const PART_COLORS = { rpm: "bg-navy", deadhead: "bg-brand", lane: "bg-slate-300" };
