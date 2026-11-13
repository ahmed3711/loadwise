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
  BeakerIcon,
  ClipboardIcon,
} from "@/components/icons";
import { canManage } from "@/lib/constants";

// Menu sections. "roles" = who sees the link (empty = everyone).
// The pages check the role again on the server, and RLS checks the data.
const SECTIONS = [
  {
    title: "Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
      { href: "/carriers", label: "Carriers", icon: BuildingIcon },
      { href: "/vehicles", label: "Vehicles", icon: TruckIcon },
      { href: "/loads", label: "Loads", icon: BoxIcon, roles: ["admin", "dispatcher", "carrier_owner"] },
    ],
  },
  {
    title: "Dispatch",
    items: [
      { href: "/matching", label: "Load Matching", icon: TargetIcon, managersOnly: true, exact: true },
      { href: "/matching/weights", label: "Weight Lab", icon: BeakerIcon, managersOnly: true },
      { href: "/bookings", label: "Bookings", driverLabel: "My Loads", icon: ClipboardIcon },
      { href: "/brokers", label: "Broker Check", icon: ShieldIcon, roles: ["admin", "dispatcher", "carrier_owner"] },
      { href: "/invoices", label: "Invoices", icon: InvoiceIcon, roles: ["admin", "dispatcher", "carrier_owner"] },
    ],
  },
];

function isVisible(item, role) {
  if (item.managersOnly) return canManage(role);
  if (item.roles) return item.roles.includes(role);
  return true;
}

export default function Sidebar({ role, onNavigate }) {
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
        {SECTIONS.map((section, sectionIndex) => {
          const items = section.items.filter((item) => isVisible(item, role));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className={sectionIndex > 0 ? "mt-8" : ""}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                        {role === "driver" && item.driverLabel ? item.driverLabel : item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
        LoadWise · Final milestone
      </div>
    </div>
  );
}
