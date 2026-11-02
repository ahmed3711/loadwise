import Spinner from "./Spinner";

// Reusable button. Shows a spinner and is disabled while "loading".
// variant: "primary" (amber), "secondary" (white), "danger" (red)
export default function Button({
  children,
  loading = false,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={loading || props.disabled}
      className={`${buttonStyles(variant)} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// Shared by Button and LinkButton so they look identical
export function buttonStyles(variant = "primary") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary: "bg-brand text-navy shadow-sm hover:bg-amber-400",
    secondary: "border border-line bg-white text-navy hover:bg-surface",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-surface hover:text-navy",
  };

  return `${base} ${variants[variant]}`;
}
