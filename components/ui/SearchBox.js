import { SearchIcon } from "@/components/icons";

// Search field shown above each table
export default function SearchBox({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <SearchIcon className="h-4 w-4" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={100}
        aria-label="Search"
        className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>
  );
}
