"use client";

import Button from "@/components/ui/Button";

// Shown automatically if something on a page crashes,
// instead of a blank or broken page.
export default function ErrorPage({ error, reset }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="mt-4 text-xl font-bold text-navy">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">
        {error?.message || "An unexpected error happened while loading this page."}
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
