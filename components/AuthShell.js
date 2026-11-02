import Card from "@/components/ui/Card";
import { TruckIcon } from "@/components/icons";

// Navy background, LoadWise name + tagline, and a white card in the centre.
// Used by the login and sign-up pages.
export default function AuthShell({ title, subtitle, wide = false, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-navy">
            <TruckIcon className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Load<span className="text-brand">Wise</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Smart load matching &amp; dispatch for small trucking carriers
          </p>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-navy">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}
