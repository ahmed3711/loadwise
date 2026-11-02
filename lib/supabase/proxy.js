import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Runs before every page loads. It refreshes the user's login
// session so they stay logged in while moving between pages.
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Stops browsers/servers from caching a page that contains login cookies
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  // IMPORTANT: do not write any code between createServerClient and getClaims().
  // getClaims() checks the login token and refreshes it if it has expired.
  await supabase.auth.getClaims();

  // In Step 5 we will add: "if not logged in, go to the login page".

  return supabaseResponse;
}