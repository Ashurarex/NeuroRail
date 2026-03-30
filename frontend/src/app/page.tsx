import Link from "next/link";

export default function Home() {
  return (
    <main className="rail-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <section className="rail-panel stagger-in w-full max-w-5xl p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              NeuroRail Command
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Railway Safety Intelligence, Tuned For Two Roles.
            </h1>
            <p className="max-w-2xl text-base text-muted sm:text-lg">
              Choose your access level to continue. Users receive alerts, search
              matches, and lost item tracking. Admins operate surveillance,
              verification, and operational controls.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/login?role=user"
                className="group rail-panel block p-5 transition hover:-translate-y-0.5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  User Portal
                </p>
                <h2 className="mt-2 text-2xl font-semibold">User</h2>
                <p className="mt-2 text-sm text-muted">
                  View alerts, upload lost item evidence, and track AI matches.
                </p>
              </Link>
              <Link
                href="/login?role=admin"
                className="group rail-panel block p-5 transition hover:-translate-y-0.5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warning">
                  Operations Console
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Admin</h2>
                <p className="mt-2 text-sm text-muted">
                  Manage cameras, alerts, users, and verification workflows.
                </p>
              </Link>
            </div>
          </div>
          <div className="rail-panel flex flex-col justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                Access Matrix Snapshot
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="rail-dot bg-accent" />
                  Users: Alerts, AI results, Lost & Found upload
                </li>
                <li className="flex items-center gap-2">
                  <span className="rail-dot bg-warning" />
                  Admins: Live surveillance and camera control
                </li>
                <li className="flex items-center gap-2">
                  <span className="rail-dot bg-slate-900" />
                  Shared: Authentication and alert visibility
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
              Already have access? Continue with login.
              <Link className="ml-2 font-semibold text-accent" href="/login">
                Open Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
