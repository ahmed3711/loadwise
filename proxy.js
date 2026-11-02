import { updateSession } from "@/lib/supabase/proxy";

// Next.js runs this "proxy" before every request.
// (In Next.js 16 this file replaced the old "middleware.js".)
export async function proxy(request) {
  return await updateSession(request);
}

// Run on all pages, but skip images and Next.js internal files.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};