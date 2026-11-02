import Link from "next/link";

// "← Back to …" link shown above the add/edit forms
export default function BackLink({ href, children }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-navy"
    >
      ← {children}
    </Link>
  );
}
