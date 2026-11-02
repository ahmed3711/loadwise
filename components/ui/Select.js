import { fieldStyles } from "./Input";

// Reusable dropdown. "options" is a list like [{ value: "driver", label: "Driver" }].
export default function Select({
  label,
  error,
  hint,
  id,
  options,
  placeholder = "Select…",
  className = "",
  ...props
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-navy">
        {label}
      </label>

      <select
        id={id}
        {...props}
        aria-invalid={error ? "true" : "false"}
        className={fieldStyles(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
