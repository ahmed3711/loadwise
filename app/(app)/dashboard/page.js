import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import RecentLoads from "@/components/loads/RecentLoads";
import {
  BuildingIcon,
  TruckIcon,
  BoxIcon,
  TargetIcon,
  ShieldIcon,
  InvoiceIcon,
  PlusIcon,
  UploadIcon,
} from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await getCurrentUser();
  const supabase = await createClient();

  // Ask Supabase for all the numbers at the same time.
  // "head: true" means "only count the rows, don't send them".
  // Row Level Security decides which rows each user can count.
  const [carriers, vehicles, loads, availableLoads, allLoads] = await Promise.all([
    supabase.from("carriers").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("loads").select("*", { count: "exact", head: true }),
    supabase.from("loads").select("*", { count: "exact", head: true }).eq("status", "available"),
    // All loads, newest first: the 5 newest are shown, and the search box searches all of them
    supabase
      .from("loads")
      .select(
        "id, origin_city, origin_state, destination_city, destination_state, pickup_date, equipment_type, weight_lbs, rate_usd, broker_name, broker_mc, status"
      )
      .order("created_at", { ascending: false }),
  ]);

  const loadError = [carriers, vehicles, loads, availableLoads, allLoads].find((result) => result.error);

  const stats = [
    { label: "Total carriers", value: carriers.count ?? 0, href: "/carriers", icon: BuildingIcon },
    { label: "Total vehicles", value: vehicles.count ?? 0, href: "/vehicles", icon: TruckIcon },
    { label: "Total loads", value: loads.count ?? 0, href: "/loads", icon: BoxIcon },
    { label: "Available loads", value: availableLoads.count ?? 0, href: "/loads", icon: TargetIcon },
  ];

  const firstName = (profile.full_name || "there").split(" ")[0];
  const isManager = canManage(profile.role);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        description={
          isManager
            ? "Here is an overview of your carriers, vehicles and loads."
            : "You have view-only access: you can browse carriers, vehicles and loads."
        }
        actions={
          isManager && (
            <>
              <LinkButton href="/loads/new">
                <PlusIcon className="h-4 w-4" /> Add load
              </LinkButton>
              <LinkButton href="/loads/upload" variant="secondary">
                <UploadIcon className="h-4 w-4" /> Upload CSV
              </LinkButton>
            </>
          )
        }
      />

      {loadError && (
        <div className="mb-6">
          <Alert type="error">Some numbers could not be loaded: {loadError.error.message}</Alert>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <span className="rounded-lg bg-brand-soft p-2 text-navy">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-navy">{formatNumber(stat.value)}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent loads + search (searches all loads) */}
      <RecentLoads loads={allLoads.data ?? []} isManager={isManager} />

      {/* Modules planned for the next milestones */}
      <section className="mt-8 rounded-2xl bg-navy p-6 text-white">
        <h2 className="text-lg font-semibold">Coming in the next milestones</h2>
        <p className="mt-1 text-sm text-slate-300">
          These modules build on the carrier, vehicle and load data you enter now.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: TargetIcon, title: "Matching engine", text: "Fit check and 0–100 profit score for every load" },
            { icon: ShieldIcon, title: "Broker risk check", text: "FMCSA authority lookup and risk flags" },
            { icon: InvoiceIcon, title: "Booking & invoicing", text: "Status tracking and weekly invoices" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-navy-light p-4">
                <Icon className="h-5 w-5 text-brand" />
                <p className="mt-2 font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}