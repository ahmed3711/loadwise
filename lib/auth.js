import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user's id and profile (name + role).
// "cache" means it only runs once per page load, even if several
// components ask for it. If nobody is logged in, go to the login page.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  // getClaims() checks the login token is real (it can't be faked)
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  return {
    userId,
    email: data.claims.email,
    profile: profile ?? { id: userId, full_name: data.claims.email, role: null },
  };
});
