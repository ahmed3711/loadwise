import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Pages anyone can open without logging in
const PUBLIC_PAGES = ["/login", "/signup"];

// Runs before every page loads. It:
// 1. refreshes the user's login session (so they stay logged in), and
// 2. protects pages: logged-out users are sent to /login,
//    logged-in users are sent away from /login and /signup.
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
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  const isPublicPage = PUBLIC_PAGES.some((page) => path.startsWith(page));

  // Logged out and trying to open a protected page -> go to login
  if (!isLoggedIn && !isPublicPage) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  // Already logged in but opening login/sign-up -> go to dashboard
  if (isLoggedIn && isPublicPage) {
    return redirectTo(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}

// Sends the user to another page, keeping any refreshed login cookies
function redirectTo(request, pathname, supabaseResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
