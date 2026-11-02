import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

// Layout for every logged-in page (dashboard, carriers, vehicles, loads).
// The "(app)" folder name in brackets groups these pages without adding
// "/app" to the web address.
export default async function AppLayout({ children }) {
  // Second safety check (after proxy.js): no login -> /login
  const { profile } = await getCurrentUser();

  return <AppShell profile={profile}>{children}</AppShell>;
}
