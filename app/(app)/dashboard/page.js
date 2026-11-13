import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canManage } from "@/lib/constants";
import { addDays, formatMoney, formatNumber, formatPercent, formatWeek, mondayOf, todayString } from "@/lib/format";
import { isRealDate } from "@/lib/validation/common";
import { weeklyCarrierMetrics, totalsOf } from "@/lib/metrics.mjs";
import PageHeader from "@/components/ui/PageHeader";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import Table from "@/components/ui/Table";
import RecentLoads from "@/components/loads/RecentLoads";
import BookingsTable from "@/components/bookings/BookingsTable";
import {
  BuildingIcon,
  TruckIcon,
  BoxIcon,
  TargetIcon,
  ClipboardIcon,
  InvoiceIcon,
  PlusIcon,
  UploadIcon,
} from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }) {
  const { profile } = await getCurrentUser();
  const { week: weekParam } = await searchParams;
  const supabase = await createClient();
  const firstName = (profile.full_name || "there").split(" ")[0];

  // ----- Drivers: their assigned loads (FR-15) -----
  if (profile.role === "driver") {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        "*, loads(*), carriers(company_name), vehicles(plate_number, equipment_type, driver:profiles!driver_id(full_name))"
      )
      .order("booked_at", { ascending: false });

    return (
      <>
        <PageHeader
          title={`Welcome back, ${firstName} 👋`}
          description="These are the loads booked on your vehicle. Update each one as you pick up and deliver."
        />
        {error ? (
          <Alert type="error">Could not load your loads: {error.message}</Alert>
        ) : (
          <BookingsTable bookings={bookings ?? []} role={profile.role} />
        )}
      </>
    );
  }

  // ----- Admin, Dispatcher, Carrier Owner -----
  const isManager = canManage(profile.role);

  // Which week the performance table shows (Monday to Sunday)
  const thisWeek = mondayOf(todayString());
  const weekStart = weekParam && isRealDate(weekParam) ? mondayOf(weekParam) : thisWeek;
  const weekEnd = addDays(weekStart, 6);

  const [carriers, vehicles, availableLoads, activeBookings, unpaid, allLoads, weekBookings] = await Promise.all([
    supabase.from("carriers").select("*", { count: "exact", head: true }),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("loads").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["booked", "picked_up", "in_transit"]),
    supabase.from("invoices").select("fee_amount").eq("status", "unpaid"),
    supabase
      .from("loads")
      .select(
        "id, origin_city, origin_state, destination_city, destination_state, pickup_date, equipment_type, weight_lbs, rate_usd, broker_name, broker_mc, status"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("carrier_id, deadhead_miles, net_rpm, carriers(company_name), loads!inner(pickup_date, rate_usd, loaded_miles)")
      .gte("loads.pickup_date", weekStart)
      .lte("loads.pickup_date", weekEnd),
  ]);

  const loadError = [carriers, vehicles, availableLoads, allLoads].find((result) => result.error);
  const bookingTablesMissing = Boolean(activeBookings.error || weekBookings.error);

  const unpaidTotal = (unpaid.data ?? []).reduce((sum, row) => sum + Number(row.fee_amount), 0);

  const stats = [
    { label: "Carriers", value: formatNumber(carriers.count ?? 0), href: "/carriers", icon: BuildingIcon },
    { label: "Vehicles", value: formatNumber(vehicles.count ?? 0), href: "/vehicles", icon: TruckIcon },
    { label: "Available loads", value: formatNumber(availableLoads.count ?? 0), href: isManager ? "/matching" : "/loads", icon: BoxIcon },
    { label: "Loads in progress", value: formatNumber(activeBookings.count ?? 0), href: "/bookings", icon: ClipboardIcon },
    { label: "Unpaid dispatch fees", value: formatMoney(unpaidTotal), href: "/invoices", icon: InvoiceIcon },
  ];

  const rows = weeklyCarrierMetrics(
    (weekBookings.data ?? []).map((b) => ({
      carrier_id: b.carrier_id,
      carrier_name: b.carriers?.company_name ?? "—",
      deadhead_miles: b.deadhead_miles,
      net_rpm: b.net_rpm,
      rate_usd: b.loads?.rate_usd,
      loaded_miles: b.loads?.loaded_miles,
      pickup_date: b.loads?.pickup_date,
    })),
    weekStart,
    weekEnd
  );
  const totals = totalsOf(rows);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        description={
          isManager
            ? "Your carriers this week: revenue, net rate per mile and empty miles."
            : "You have view-only access to carriers, loads, bookings and invoices."
        }
        actions={
          isManager && (
            <>
              <LinkButton href="/matching">
                <TargetIcon className="h-4 w-4" /> Match loads
              </LinkButton>
              <LinkButton href="/loads/new" variant="secondary">
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
      {bookingTablesMissing && (
        <div className="mb-6">
          <Alert type="info">
            Bookings and invoices aren&apos;t set up in the database yet. Run supabase/schema-part2.sql in Supabase.
          </Alert>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
              <p className="mt-3 text-3xl font-bold text-navy">{stat.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Weekly carrier performance (FR-16) */}
      <section className="mt-8 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-navy">Weekly carrier performance</h2>
            <p className="text-sm text-slate-500">
              Booked loads picked up in the week of {formatWeek(weekStart)}
              {weekStart === thisWeek ? " (this week)" : ""}.
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/dashboard?week=${addDays(weekStart, -7)}`} variant="secondary">
              ← Previous
            </LinkButton>
            {weekStart !== thisWeek && (
              <LinkButton href="/dashboard" variant="secondary">
                This week
              </LinkButton>
            )}
            <LinkButton href={`/dashboard?week=${addDays(weekStart, 7)}`} variant="secondary">
              Next →
            </LinkButton>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-line bg-white px-6 py-10 text-center text-sm text-slate-500">
            No booked loads were picked up in this week.
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: "carrier", label: "Carrier", render: (r) => <span className="font-semibold">{r.carrierName}</span> },
                { key: "loads", label: "Loads", render: (r) => r.loads },
                { key: "gross", label: "Gross revenue", render: (r) => formatMoney(r.grossRevenue) },
                { key: "rpm", label: "Avg net rate / mile", render: (r) => formatMoney(r.avgNetRpm) },
                { key: "miles", label: "Loaded / empty miles", render: (r) => `${formatNumber(r.loadedMiles)} / ${formatNumber(r.emptyMiles)}` },
                {
                  key: "empty",
                  label: "Empty miles",
                  render: (r) => (
                    <span className={r.emptyShare > 0.2 ? "font-semibold text-red-600" : "font-semibold text-green-700"}>
                      {formatPercent(r.emptyShare)}
                    </span>
                  ),
                },
              ]}
              rows={rows.map((r) => ({ ...r, id: r.carrierId }))}
            />
            <p className="text-sm text-slate-500">
              All carriers: {totals.loads} loads · {formatMoney(totals.grossRevenue)} gross ·{" "}
              {formatMoney(totals.avgNetRpm)} average net per mile · {formatPercent(totals.emptyShare)} empty miles
            </p>
          </>
        )}
      </section>

      {/* Recent loads + search (searches all loads) */}
      <RecentLoads loads={allLoads.data ?? []} isManager={isManager} />
    </>
  );
}
