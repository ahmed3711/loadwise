"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, friendlyAuthError } from "@/lib/validation/auth";
import AuthShell from "@/components/AuthShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    setServerError("");
    setSuccessMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(friendlyAuthError(error.message));
      return;
    }

    setSuccessMessage("Logged in! Taking you to your dashboard…");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your LoadWise account.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Alert type="error">{serverError}</Alert>
        <Alert type="success">{successMessage}</Alert>

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

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Your password"
          maxLength={72}
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>

        <p className="text-center text-sm text-slate-600">
          New to LoadWise?{" "}
          <Link
            href="/signup"
            className="font-semibold text-navy underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
