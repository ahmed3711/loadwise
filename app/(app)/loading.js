import Spinner from "@/components/ui/Spinner";

// Shown automatically while a page is loading its data from Supabase
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-brand">
      <Spinner />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
