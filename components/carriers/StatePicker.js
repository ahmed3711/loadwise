import { US_STATES } from "@/lib/constants";

// Clickable grid of the 50 states + DC for "preferred states".
// Each state is a hidden checkbox styled as a button; checked = amber.
export default function StatePicker({ register, name, error }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1 block text-sm font-medium text-navy">
        Preferred states <span className="font-normal text-slate-500">(optional)</span>
      </legend>
      <p className="mb-2 text-xs text-slate-500">
        Click the states this carrier likes to run loads in. Click again to remove.
      </p>

      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9 lg:grid-cols-13">
        {US_STATES.map((state) => (
          <label key={state.code} title={state.name} className="cursor-pointer">
            <input type="checkbox" value={state.code} className="peer sr-only" {...register(name)} />
            <span className="block rounded-md border border-line bg-white py-1.5 text-center text-xs font-semibold text-slate-600 transition hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-navy peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
              {state.code}
            </span>
          </label>
        ))}
      </div>

      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  );
}
