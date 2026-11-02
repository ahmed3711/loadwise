// Friendly box shown when a list has no data yet
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-white px-6 py-14 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-navy">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
