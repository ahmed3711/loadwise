"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { LogoutIcon } from "@/components/icons";

// Logs the user out and sends them to the login page
export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" loading={loading} onClick={handleLogout} className="px-3">
      {!loading && <LogoutIcon className="h-4 w-4" />}
      <span className="hidden sm:inline">{loading ? "Logging out…" : "Log out"}</span>
    </Button>
  );
}
