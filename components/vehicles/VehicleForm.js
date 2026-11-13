"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { vehicleSchema, emptyVehicle, vehicleToForm } from "@/lib/validation/vehicle";
import { friendlyDbError } from "@/lib/db-errors";
import { DEFAULT_FUEL_COST, EQUIPMENT_TYPES, STATE_OPTIONS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";

// Add / edit vehicle form. "carriers" fills the "Carrier" dropdown and
// "drivers" (users with the Driver role) fills the "Assigned driver" one.
export default function VehicleForm({ vehicle, carriers, drivers = [] }) {
  const router = useRouter();
  const isEdit = Boolean(vehicle);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    mode: "onTouched",
    defaultValues: isEdit ? vehicleToForm(vehicle) : emptyVehicle,
  });

  const carrierOptions = carriers.map((carrier) => ({
    value: String(carrier.id),
    label: carrier.company_name,
  }));

  const driverOptions = drivers.map((driver) => ({ value: driver.id, label: driver.full_name }));

  // Pre-fill a typical fuel cost when the equipment type is chosen
  const equipmentField = register("equipment_type");
  function onEquipmentChange(event) {
    equipmentField.onChange(event);
    const typical = DEFAULT_FUEL_COST[event.target.value];
    if (typical && !getValues("fuel_cost_per_mile")) {
      setValue("fuel_cost_per_mile", typical.toFixed(2), { shouldValidate: true });
    }
  }

  async function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    const supabase = createClient();

    const request = isEdit
      ? supabase.from("vehicles").update(values).eq("id", vehicle.id).select("id")
      : supabase.from("vehicles").insert(values).select("id");

    const { data, error } = await request;

    if (error) {
      setServerError(friendlyDbError(error));
      return;
    }
    if (!data || data.length === 0) {
      setServerError("You don't have permission to save this vehicle.");
      return;
    }

    setSuccessMessage(isEdit ? "Vehicle updated! Going back to the list…" : "Vehicle added! Going back to the list…");
    router.push(`/vehicles?success=${isEdit ? "updated" : "added"}`);
    router.refresh();
  }

  const isSaving = isSubmitting || Boolean(successMessage);

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

        <FormSection title="Vehicle" description="Which carrier owns it and what kind of equipment it is.">
          <Select
            id="carrier_id"
            label="Carrier"
            options={carrierOptions}
            placeholder="Choose a carrier"
            required
            error={errors.carrier_id?.message}
            {...register("carrier_id")}
          />
          <Select
            id="equipment_type"
            label="Equipment type"
            options={EQUIPMENT_TYPES}
            placeholder="Choose equipment"
            required
            error={errors.equipment_type?.message}
            {...equipmentField}
            onChange={onEquipmentChange}
          />
        </FormSection>

        <FormSection
          title="Interior size and capacity"
          description="These limits decide which loads fit this vehicle."
        >
          <Input
            id="length_ft"
            label="Interior length (ft)"
            type="number"
            min={5}
            max={53}
            step={0.1}
            placeholder="5 – 53, e.g. 26"
            required
            error={errors.length_ft?.message}
            {...register("length_ft")}
          />
          <Input
            id="width_in"
            label="Interior width (in)"
            type="number"
            min={40}
            max={102}
            step={0.1}
            placeholder="40 – 102, e.g. 96"
            required
            error={errors.width_in?.message}
            {...register("width_in")}
          />
          <Input
            id="height_in"
            label="Interior height (in)"
            type="number"
            min={36}
            max={162}
            step={0.1}
            placeholder="36 – 162, e.g. 96"
            required
            error={errors.height_in?.message}
            {...register("height_in")}
          />
          <Input
            id="max_payload_lbs"
            label="Max payload (lbs)"
            type="number"
            min={1}
            max={80000}
            step={1}
            placeholder="1 – 80,000, e.g. 10000"
            required
            error={errors.max_payload_lbs?.message}
            {...register("max_payload_lbs")}
          />
          <Input
            id="max_pallets"
            label="Max pallets"
            type="number"
            min={0}
            max={30}
            step={1}
            placeholder="0 – 30, e.g. 12"
            required
            error={errors.max_pallets?.message}
            {...register("max_pallets")}
          />
        </FormSection>

        <FormSection title="Registration" description="Letters are saved in capitals automatically.">
          <Input
            id="plate_number"
            label="Plate number"
            placeholder="2–8 letters/numbers, e.g. ABC1234"
            maxLength={8}
            required
            error={errors.plate_number?.message}
            {...register("plate_number")}
          />
          <Input
            id="vin"
            label="VIN"
            placeholder="17 characters, no I, O or Q"
            maxLength={17}
            required
            error={errors.vin?.message}
            {...register("vin")}
          />
        </FormSection>

        <FormSection
          title="Location, costs and driver"
          description="Used by the matching engine for empty miles and net rate per mile."
        >
          <Input
            id="current_city"
            label="Current city (optional)"
            placeholder="Leave empty to use the carrier's home base"
            maxLength={50}
            error={errors.current_city?.message}
            {...register("current_city")}
          />
          <Select
            id="current_state"
            label="Current state (optional)"
            options={STATE_OPTIONS}
            placeholder="Same as home base"
            error={errors.current_state?.message}
            {...register("current_state")}
          />
          <Input
            id="fuel_cost_per_mile"
            label="Fuel cost per mile (USD)"
            type="number"
            min={0.01}
            max={5}
            step={0.01}
            placeholder="e.g. 0.45"
            required
            hint="Used to cost the empty miles to pickup."
            error={errors.fuel_cost_per_mile?.message}
            {...register("fuel_cost_per_mile")}
          />
          <Select
            id="driver_id"
            label="Assigned driver (optional)"
            options={driverOptions}
            placeholder={drivers.length ? "No driver" : "No Driver accounts yet"}
            hint="The driver sees the loads booked on this vehicle."
            error={errors.driver_id?.message}
            {...register("driver_id")}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <LinkButton href="/vehicles" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={isSaving}>
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add vehicle"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
