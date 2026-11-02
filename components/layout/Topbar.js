"use client";

import LogoutButton from "@/components/LogoutButton";
import Badge from "@/components/ui/Badge";
import { MenuIcon } from "@/components/icons";
import { ROLES, labelFor } from "@/lib/constants";

// Bar at the top: menu button (mobile), user's name, role and logout
export default function Topbar({ profile, onMenuClick }) {
  const initials = (profile.full_name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-navy hover:bg-surface lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      <span className="text-lg font-bold text-navy lg:hidden">
        Load<span className="text-brand">Wise</span>
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-navy">{profile.full_name}</p>
          <p className="text-xs text-slate-500">{labelFor(ROLES, profile.role)}</p>
        </div>
        <span className="sm:hidden">
          <Badge color="amber">{labelFor(ROLES, profile.role)}</Badge>
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-brand"
          aria-hidden="true"
        >
          {initials}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
