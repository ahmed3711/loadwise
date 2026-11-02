"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { carrierSchema, emptyCarrier, carrierToForm } from "@/lib/validation/carrier";
import { friendlyDbError } from "@/lib/db-errors";
import { STATE_OPTIONS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import FormSection from "@/components/ui/FormSection";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Alert from "@/components/ui/Alert";
import StatePicker from "./StatePicker";

// Add / edit carrier form (FR-01).
// If a "carrier" is passed in, the form edits it; otherwise it adds a new one.
export default function CarrierForm({ carrier }) {
  const router = useRouter();
  const isEdit = Boolean(carrier);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(carrierSchema),
    mode: "onTouched",
    defaultValues: isEdit ? carrierToForm(carrier) : emptyCarrier,
  });

  // "values" are already checked and converted by Zod (e.g. rate is a number)
  async function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");
    const supabase = createClient();

    const request = isEdit
      ? supabase.from("carriers").update(values).eq("id", carrier.id).select("id")
      : supabase.from("carriers").insert(values).select("id");

    const { data, error } = await request;

    if (error) {
      setServerError(friendlyDbError(error));
      return;
    }
    if (!data || data.length === 0) {
      setServerError("You don't have permission to save this carrier.");
      return;
    }

    setSuccessMessage(isEdit ? "Carrier updated! Going back to the list…" : "Carrier added! Going back to the list…");
    router.push(`/carriers?success=${isEdit ? "updated" : "added"}`);
    router.refresh();
  }

  const isSaving = isSubmitting || Boolean(successMessage);

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

        <FormSection title="Company details" description="Legal name and FMCSA numbers.">
          <Input
            id="company_name"
            label="Company name"
            placeholder="e.g. Swift Lane Logistics LLC"
            maxLength={100}
            required
            className="sm:col-span-2"
            error={errors.company_name?.message}
            {...register("company_name")}
          />
          <Input
            id="mc_number"
            label="MC number"
            inputMode="numeric"
            placeholder="6–8 digits, e.g. 1234567"
            maxLength={8}
            required
            error={errors.mc_number?.message}
            {...register("mc_number")}
          />
          <Input
            id="dot_number"
            label="USDOT number"
            inputMode="numeric"
            placeholder="5–8 digits, e.g. 3456789"
            maxLength={8}
            required
            error={errors.dot_number?.message}
            {...register("dot_number")}
          />
        </FormSection>

        <FormSection title="Contact" description="How the dispatcher reaches this carrier.">
          <Input
            id="contact_email"
            label="Contact email"
            type="email"
            placeholder="ops@company.com"
            maxLength={100}
            required
            error={errors.contact_email?.message}
            {...register("contact_email")}
          />
          <Input
            id="contact_phone"
            label="Contact phone (US, 10 digits)"
            type="tel"
            inputMode="numeric"
            placeholder="5551234567"
            maxLength={10}
            required
            error={errors.contact_phone?.message}
            {...register("contact_phone")}
          />
        </FormSection>

        <FormSection title="Home base" description="Where the truck usually starts and ends its week.">
          <Input
            id="home_city"
            label="City"
            placeholder="e.g. Dallas"
            maxLength={50}
            required
            error={errors.home_city?.message}
            {...register("home_city")}
          />
          <Select
            id="home_state"
            label="State"
            options={STATE_OPTIONS}
            placeholder="Choose a state"
            required
            error={errors.home_state?.message}
            {...register("home_state")}
          />
          <Input
            id="zip_code"
            label="ZIP code"
            inputMode="numeric"
            placeholder="5 digits, e.g. 75201"
            maxLength={5}
            required
            error={errors.zip_code?.message}
            {...register("zip_code")}
          />
        </FormSection>

        <FormSection title="Preferences" description="Used later by the matching engine to rank loads.">
          <Input
            id="min_rate_per_mile"
            label="Minimum rate per mile (USD)"
            type="number"
            min={0.01}
            max={20}
            step={0.01}
            placeholder="e.g. 2.25"
            required
            hint="Greater than 0 and at most 20, up to 2 decimals."
            error={errors.min_rate_per_mile?.message}
            {...register("min_rate_per_mile")}
          />
          <StatePicker register={register} name="preferred_states" error={errors.preferred_states?.message} />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <LinkButton href="/carriers" variant="secondary">
            Cancel
          </LinkButton>
          <Button type="submit" loading={isSaving}>
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add carrier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
