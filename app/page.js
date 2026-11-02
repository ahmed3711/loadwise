export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          Semester Project · Software Construction &amp; Development
        </p>

        <h1 className="mt-2 text-4xl font-bold text-navy">
          Load<span className="text-brand">Wise</span>
        </h1>

        <p className="mt-3 text-slate-600">
          Smart Load Matching &amp; Dispatch Management System for Small
          Trucking Carriers
        </p>

        <p className="mt-6 inline-block rounded-full bg-brand-soft px-4 py-1 text-sm text-navy">
          ✅ Step 1 complete: Next.js and Tailwind are working
        </p>
      </div>
    </main>
  );
}