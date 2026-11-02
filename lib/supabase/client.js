import { createBrowserClient } from "@supabase/ssr";

// Creates a Supabase client for code that runs in the browser
// (for example, forms with buttons and inputs).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
