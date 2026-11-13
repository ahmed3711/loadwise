import { BOOKING_STEPS, LOAD_STATUSES, labelFor } from "@/lib/constants";

// Five small dots showing how far a booking has got
export default function StatusSteps({ status }) {
  const reached = BOOKING_STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1" aria-label={`Step ${reached + 1} of ${BOOKING_STEPS.length}`}>
      {BOOKING_STEPS.map((step, index) => (
        <li
          key={step}
          title={labelFor(LOAD_STATUSES, step)}
          className={`h-1.5 w-5 rounded-full ${index <= reached ? "bg-brand" : "bg-line"}`}
        />
      ))}
    </ol>
  );
}
