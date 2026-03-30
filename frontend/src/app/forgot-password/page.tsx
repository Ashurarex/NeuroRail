import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="rail-gradient flex min-h-screen items-center justify-center p-4">
      <section className="rail-panel w-full max-w-lg p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.15em] text-muted">Recovery</p>
        <h1 className="mt-2 text-3xl font-bold">Forgot Password</h1>
        <p className="mt-3 text-sm text-muted">
          Password reset flow will be wired once backend reset-token endpoints are added.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">
            Back to Login
          </Link>
          <Link href="/" className="rounded-xl border border-line px-4 py-2 font-semibold">
            Back to Role Select
          </Link>
        </div>
      </section>
    </main>
  );
}
