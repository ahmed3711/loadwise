"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";

// Dropdown at the top of the Matching page. Choosing a vehicle reloads
// the page with ?vehicle=ID so the server ranks loads for that vehicle.
export default function VehiclePicker({ options, value, basePath = "/matching", param = "vehicle", label = "Vehicle" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-end gap-3">
      <Select
        id="vehicle-picker"
        label={label}
        options={options}
        placeholder={`Choose a ${label.toLowerCase()}`}
        value={value}
        className="w-full sm:max-w-md"
        onChange={(event) => {
          if (!event.target.value) return;
          startTransition(() => router.push(`${basePath}?${param}=${event.target.value}`));
        }}
      />
      {isPending && (
        <span className="mb-2 text-navy">
          <Spinner size="sm" />
        </span>
      )}
    </div>
  );
}
