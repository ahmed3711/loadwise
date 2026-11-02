// A titled group of fields inside a form (e.g. "Company details")
export default function FormSection({ title, description, children }) {
  return (
    <section className="border-b border-line pb-6 last:border-b-0 last:pb-0">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
