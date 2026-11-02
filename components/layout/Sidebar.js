"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  BuildingIcon,
  TruckIcon,
  BoxIcon,
  TargetIcon,
  ShieldIcon,
  InvoiceIcon,
} from "@/components/icons";

// Pages that work in this milestone
const MENU = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/carriers", label: "Carriers", icon: BuildingIcon },
  { href: "/vehicles", label: "Vehicles", icon: TruckIcon },
  { href: "/loads", label: "Loads", icon: BoxIcon },
];

// Modules planned for later milestones (shown greyed out)
const COMING_SOON = [
  { label: "Matching", icon: TargetIcon },
  { label: "Broker Check", icon: ShieldIcon },
  { label: "Invoices", icon: InvoiceIcon },
];

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-navy text-slate-300">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-navy">
          <TruckIcon className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold text-white">
          Load<span className="text-brand">Wise</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </p>
        <ul className="space-y-1">
          {MENU.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-brand text-navy" : "hover:bg-navy-light hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Coming soon
        </p>
        <ul className="space-y-1">
          {COMING_SOON.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.label}
                aria-disabled="true"
                title="Coming in a later milestone"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500"
              >
                <Icon className="h-5 w-5" />
                {item.label}
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Soon
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
        LoadWise · Milestone 1
      </div>
    </div>
  );
}
