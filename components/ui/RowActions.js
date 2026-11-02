import Link from "next/link";

// "Edit" and "Delete" buttons shown at the end of each table row
export default function RowActions({ editHref, onDelete, label }) {
  return (
    <div className="flex justify-end gap-2">
      <Link
        href={editHref}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-navy transition hover:border-brand hover:bg-brand-soft"
        aria-label={`Edit ${label}`}
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        aria-label={`Delete ${label}`}
      >
        Delete
      </button>
    </div>
  );
}
