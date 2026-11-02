// Small coloured label, e.g. for load status or equipment type
export default function Badge({ color = "slate", children }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-brand-soft text-navy",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[color]}`}
    >
      {children}
    </span>
  );
}
