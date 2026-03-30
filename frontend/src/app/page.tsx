"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <main className="rail-gradient flex min-h-screen items-center justify-center">
        <div className="rail-panel flex flex-col items-center gap-4 px-10 py-12">
          <Image
            src="/neurorail-logo.svg"
            alt="NeuroRail logo"
            width={72}
            height={72}
            className="h-18 w-18"
          />
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              NeuroRail
            </p>
            <h1 className="mt-2 text-2xl font-bold">Railway Safety Intelligence</h1>
          </div>
          <div className="h-1 w-24 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rail-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <section className="rail-panel stagger-in w-full max-w-5xl p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image
                src="/neurorail-logo.svg"
                alt="NeuroRail logo"
                width={48}
                height={48}
                className="h-12 w-12"
              />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                NeuroRail
              </p>
            </div>
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
