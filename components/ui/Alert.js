// Coloured message box for success or error messages.
// Shows nothing if there is no message.
export default function Alert({ type = "error", children }) {
  if (!children) return null;

  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-brand/40 bg-brand-soft text-navy",
  };

  const icons = { error: "⚠️", success: "✅", info: "ℹ️" };

  return (
    <div role="alert" className={`flex gap-2 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <span aria-hidden="true">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}
