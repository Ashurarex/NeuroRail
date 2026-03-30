"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { normalizeRole, setAuthSession, type AppRole } from "@/lib/auth";
import { login } from "@/lib/api/auth-service";
import { isStrongPassword, isValidEmail } from "@/lib/validation";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const role = useMemo<AppRole>(
    () => normalizeRole(searchParams.get("role")),
    [searchParams],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => isValidEmail(email) && isStrongPassword(password),
    [email, password],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || pending) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await login({ email, password });
      const resolvedRole = response.role === "admin" ? "admin" : "user";
      setAuthSession(response.access_token, resolvedRole, rememberMe);

      const next = searchParams.get("next");
      const destination = next || (resolvedRole === "admin" ? "/admin/dashboard" : "/user/home");
      router.push(destination);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Login failed.";
      setError(message);
    } finally {
      setPending(false);
    }
  }


  return (
    <main className="rail-gradient flex min-h-screen items-center justify-center p-4">
      <section className="rail-panel w-full max-w-xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link className="text-sm font-semibold text-accent" href="/">
            Back
          </Link>
          <p className="text-xs uppercase tracking-[0.15em] text-muted">Login</p>
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
            <h1 className="text-3xl font-bold">Secure Entry</h1>
            <p className="mt-2 text-sm text-muted">Sign in to continue to NeuroRail.</p>
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
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="h-11 rounded-xl border border-line bg-surface px-3"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me
            </label>
            <Link className="font-semibold text-accent" href="/forgot-password">
              Forgot Password
            </Link>
          </div>

          <button
            disabled={!canSubmit || pending}
            type="submit"
            className="h-11 w-full rounded-xl bg-accent px-4 font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          New here?
          <Link className="ml-2 font-semibold text-accent" href={`/signup?role=${role}`}>
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="rail-gradient flex min-h-screen items-center justify-center p-4">
          <section className="rail-panel w-full max-w-xl p-6 sm:p-8">Loading...</section>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
