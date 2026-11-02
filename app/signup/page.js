"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { signupSchema, PASSWORD_RULES, friendlyAuthError } from "@/lib/validation/auth";
import { ROLES } from "@/lib/constants";
import AuthShell from "@/components/AuthShell";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: "onTouched", // check a field when the user leaves it, then live while typing
    defaultValues: {
      fullName: "",
      email: "",
      age: "",
      phone: "",
      role: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch the password so the checklist updates live while typing
  const password = watch("password") || "";

  async function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");

    const supabase = createClient();

    // Create the account. The extra "data" is saved with the user and
    // our database trigger copies it into the "profiles" table.
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          age: Number(values.age),
          phone: values.phone,
          role: values.role,
        },
      },
    });

    if (error) {
      setServerError(friendlyAuthError(error.message));
      return;
    }

    // Only happens if "Confirm email" is turned on in Supabase
    if (!data.session) {
      setSuccessMessage("Account created! Please check your email to confirm it, then log in.");
      return;
    }

    setSuccessMessage("Account created! Taking you to your dashboard…");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up to start managing carriers and loads."
      wide
    >
      {/* noValidate: we show our own red messages instead of the browser's pop-ups */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

        <Input
          id="fullName"
          label="Full name"
          type="text"
          placeholder="e.g. Ahmed Ali"
          maxLength={50}
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          maxLength={100}
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="age"
            label="Age"
            type="number"
            min={18}
            max={75}
            step={1}
            placeholder="e.g. 25"
            required
            error={errors.age?.message}
            {...register("age")}
          />

          <Input
            id="phone"
            label="Phone (US, 10 digits)"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="5551234567"
            autoComplete="tel-national"
            required
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>

        <Select
          id="role"
          label="Role"
          options={ROLES}
          placeholder="Choose your role"
          required
          hint="Drivers must be at least 21 years old."
          error={errors.role?.message}
          {...register("role")}
        />

        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Create a strong password"
            maxLength={72}
            autoComplete="new-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Live checklist: turns green as each rule is met */}
          <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={passed ? "font-medium text-green-700" : "text-slate-500"}
                >
                  {passed ? "✓" : "○"} {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Input
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Type your password again"
          maxLength={72}
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-navy underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
