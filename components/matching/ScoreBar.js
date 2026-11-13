// Score from 0 to 100 shown as a number and a bar (FR-08)
export function scoreColor(score) {
  if (score >= 70) return "bg-green-500";
  if (score >= 45) return "bg-brand";
  return "bg-red-400";
}

export default function ScoreBar({ score, size = "md" }) {
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className={size === "lg" ? "w-32" : "w-24"}>
      <div className="flex items-baseline justify-between">
        <span className={`font-bold text-navy ${size === "lg" ? "text-2xl" : "text-lg"}`}>{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className={`h-full rounded-full ${scoreColor(score)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// The four parts of the score, each as a small labelled bar
export function ScoreBreakdown({ components, weights }) {
  const parts = [
    { key: "rpm", label: "Net rate/mile" },
    { key: "deadhead", label: "Low empty miles" },
    { key: "lane", label: "Preferred lane" },
    { key: "broker", label: "Broker trust" },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {parts.map((part) => {
        const value = components[part.key] ?? 0;
        const points = Math.round(value * (weights[part.key] ?? 0));
        return (
          <div key={part.key}>
            <div className="flex justify-between text-xs">
              <dt className="text-slate-500">{part.label}</dt>
              <dd className="font-semibold text-navy">
                {points} / {weights[part.key]} pts
              </dd>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <div className="h-full rounded-full bg-navy" style={{ width: `${Math.round(value * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
