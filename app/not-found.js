import LinkButton from "@/components/ui/LinkButton";

// Shown when a page or record doesn't exist (404)
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-brand">404</p>
        <h1 className="mt-4 text-2xl font-bold text-navy">Page not found</h1>
        <p className="mt-2 text-slate-500">
          This page doesn&apos;t exist, or you don&apos;t have permission to see it.
        </p>
        <LinkButton href="/dashboard" className="mt-6">
          Back to dashboard
        </LinkButton>
      </div>
    </main>
  );
}
