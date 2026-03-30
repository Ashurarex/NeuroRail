"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { signUp } from "@/lib/api/auth-service";
import { normalizeRole, type AppRole } from "@/lib/auth";
import { isStrongPassword, isValidEmail, isValidPhone } from "@/lib/validation";

type FormState = {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useMemo<AppRole>(
    () => normalizeRole(searchParams.get("role")),
    [searchParams],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const valid = useMemo(() => {
    return (
      isValidEmail(form.email) &&
      isValidPhone(form.phone) &&
      isStrongPassword(form.password) &&
      form.password === form.confirmPassword
    );
  }, [form]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await signUp({
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
      });
      router.push(`/login?role=${role}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Sign up failed.";
      setError(message);
    } finally {
      setPending(false);
    }
  }


  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="rail-gradient flex min-h-dvh items-center justify-center p-4">
      <section className="rail-panel w-full max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link className="text-sm font-semibold text-accent" href="/login">
            Back
          </Link>
          <p className="text-xs uppercase tracking-[0.15em] text-muted">Sign Up</p>
        </div>

        <div className="flex items-center gap-3">
          <Image
            src="/neurorail-logo.svg"
            alt="NeuroRail logo"
            width={48}
            height={48}
            className="h-12 w-12"
          />
          <div>
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="mt-2 text-sm text-muted">Register as a user or admin.</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Role</label>
            <p className="rounded-xl border border-line bg-surface px-3 py-2 text-sm capitalize">
              {role}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="h-11 rounded-xl border border-line bg-surface px-3"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              placeholder="+919876543210"
              className="h-11 rounded-xl border border-line bg-surface px-3"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="h-11 rounded-xl border border-line bg-surface px-3"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              className="h-11 rounded-xl border border-line bg-surface px-3"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!valid || pending}
            className="h-11 w-full rounded-xl bg-accent px-4 font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? "Creating account..." : "Sign up"}
          </button>

        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already registered?
          <Link className="ml-2 font-semibold text-accent" href={`/login?role=${role}`}>
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <main className="rail-gradient flex min-h-dvh items-center justify-center p-4">
          <section className="rail-panel w-full max-w-xl p-6 sm:p-8">Loading...</section>
        </main>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
