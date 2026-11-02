// Small spinning circle shown while something is loading
export default function Spinner({ size = "md" }) {
  const sizes = { sm: "h-4 w-4 border-2", md: "h-8 w-8 border-[3px]" };
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${sizes[size]}`}
    />
  );
}
