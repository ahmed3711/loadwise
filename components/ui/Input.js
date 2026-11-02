// Reusable input with a label, an optional hint, and a red error message underneath.
export default function Input({ label, error, hint, id, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-navy">
        {label}
      </label>

      <input
        id={id}
        {...props}
        aria-invalid={error ? "true" : "false"}
        className={fieldStyles(error)}
      />

      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// Shared look for inputs and dropdowns (red border when there is an error)
export function fieldStyles(error) {
  const base =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2";
  return error
    ? `${base} border-red-400 focus:ring-red-200`
    : `${base} border-line focus:border-brand focus:ring-brand/30`;
}
