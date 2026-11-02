"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { makeLoadSchema, emptyLoad, loadToForm } from "@/lib/validation/load";
import { friendlyDbError } from "@/lib/db-errors";
import { EQUIPMENT_TYPES, STATE_OPTIONS } from "@/lib/constants";
import { formatMoney, todayString } from "@/lib/format";
import Card from "@/components/ui/Card";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";

// Add / edit load form (FR-03)
export default function LoadForm({ load }) {
  const router = useRouter();
  const isEdit = Boolean(load);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // When editing an old load, its (past) pickup date is still allowed
  const schema = useMemo(() => makeLoadSchema(isEdit ? load.pickup_date : null), [isEdit, load]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: isEdit ? loadToForm(load) : emptyLoad,
  });

  // Live "rate per mile" preview under the rate field
  const rate = Number(watch("rate_usd"));
  const miles = Number(watch("loaded_miles"));
  const ratePerMile = rate > 0 && miles > 0 ? formatMoney(rate / miles) : null;

  // The date picker can't go before today (unless editing an old load)
  const today = todayString();
  const pickupMin = isEdit && load.pickup_date < today ? load.pickup_date : today;
  const pickupDate = watch("pickup_date");

  async function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    const supabase = createClient();

    const request = isEdit
      ? supabase.from("loads").update(values).eq("id", load.id).select("id")
      : supabase.from("loads").insert(values).select("id");

    const { data, error } = await request;

    if (error) {
      setServerError(friendlyDbError(error));
      return;
    }
    if (!data || data.length === 0) {
      setServerError("You don't have permission to save this load.");
      return;
    }

    setSuccessMessage(isEdit ? "Load updated! Going back to the list…" : "Load added! Going back to the list…");
    router.push(`/loads?success=${isEdit ? "updated" : "added"}`);
    router.refresh();
  }

  const isSaving = isSubmitting || Boolean(successMessage);

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

        <FormSection title="Route" description="Where the freight is picked up and delivered.">
          <Input
            id="origin_city"
            label="Origin city"
            placeholder="e.g. Dallas"
            maxLength={50}
            required
            error={errors.origin_city?.message}
            {...register("origin_city")}
          />
          <Select
            id="origin_state"
            label="Origin state"
            options={STATE_OPTIONS}
            placeholder="Choose a state"
            required
            error={errors.origin_state?.message}
            {...register("origin_state")}
          />
          <Input
            id="destination_city"
            label="Destination city"
            placeholder="e.g. Chicago"
            maxLength={50}
            required
            error={errors.destination_city?.message}
            {...register("destination_city")}
          />
          <Select
            id="destination_state"
            label="Destination state"
            options={STATE_OPTIONS}
            placeholder="Choose a state"
            required
            error={errors.destination_state?.message}
            {...register("destination_state")}
          />
          <Input
            id="loaded_miles"
            label="Loaded miles"
            type="number"
            min={1}
            max={5000}
            step={1}
            placeholder="1 – 5,000, e.g. 925"
            required
            error={errors.loaded_miles?.message}
            {...register("loaded_miles")}
          />
        </FormSection>

        <FormSection title="Dates" description="Pickup can't be in the past; delivery is on or after pickup.">
          <Input
            id="pickup_date"
            label="Pickup date"
            type="date"
            min={pickupMin}
            required
            error={errors.pickup_date?.message}
            {...register("pickup_date")}
          />
          <Input
            id="delivery_date"
            label="Delivery date"
            type="date"
            min={pickupDate || pickupMin}
            required
            error={errors.delivery_date?.message}
            {...register("delivery_date")}
          />
        </FormSection>

        <FormSection title="Freight" description="Used later to check the load fits the vehicle.">
          <Select
            id="equipment_type"
            label="Equipment type"
            options={EQUIPMENT_TYPES}
            placeholder="Choose equipment"
            required
            error={errors.equipment_type?.message}
            {...register("equipment_type")}
          />
          <Input
            id="weight_lbs"
            label="Weight (lbs)"
            type="number"
            min={1}
            max={80000}
            step={1}
            placeholder="1 – 80,000, e.g. 12000"
            required
            error={errors.weight_lbs?.message}
            {...register("weight_lbs")}
          />
          <Input
            id="pallet_count"
            label="Pallet count"
            type="number"
            min={0}
            max={30}
            step={1}
            placeholder="0 – 30, e.g. 10"
            required
            error={errors.pallet_count?.message}
            {...register("pallet_count")}
          />
          <Input
            id="length_ft"
            label="Load length (ft)"
            type="number"
            min={0.1}
            max={53}
            step={0.1}
            placeholder="up to 53, e.g. 20"
            required
            error={errors.length_ft?.message}
            {...register("length_ft")}
          />
        </FormSection>

        <FormSection title="Rate and broker" description="Who is offering the load and how much it pays.">
          <Input
            id="rate_usd"
            label="Rate (USD)"
            type="number"
            min={0.01}
            max={100000}
            step={0.01}
            placeholder="e.g. 2450.00"
            required
            hint={ratePerMile ? `≈ ${ratePerMile} per loaded mile` : "Total pay for the load, up to 2 decimals."}
            error={errors.rate_usd?.message}
            {...register("rate_usd")}
          />
          <Input
            id="broker_name"
            label="Broker name"
            placeholder="e.g. TQL"
            maxLength={100}
            required
            error={errors.broker_name?.message}
            {...register("broker_name")}
          />
          <Input
            id="broker_mc"
            label="Broker MC number"
            inputMode="numeric"
            placeholder="6–8 digits, e.g. 411443"
            maxLength={8}
            required
            error={errors.broker_mc?.message}
            {...register("broker_mc")}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <LinkButton href="/loads" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={isSaving}>
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add load"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
