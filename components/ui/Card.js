// Reusable white box with rounded corners.
export default function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8 ${className}`}>
      {children}
    </div>
  );
}
