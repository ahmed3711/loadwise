import { createClient } from "@/lib/supabase/server";

// Test page: reads rows from the "connection_test" table in Supabase
export default async function TestPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connection_test")
    .select("id, message");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-navy">
          Supabase connection test
        </h1>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">❌ Could not read from Supabase</p>
            <p className="mt-1">{error.message}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="mt-4 rounded-lg bg-brand-soft p-4 text-sm text-navy">
            ⚠️ Connected, but no rows came back. If the table has data,
            check its Row Level Security policy.
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">✅ Connected! Rows read from the database:</p>
            <ul className="mt-2 list-disc pl-5">
              {data.map((row) => (
                <li key={row.id}>{row.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}