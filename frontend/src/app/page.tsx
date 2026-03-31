"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <main className="rail-gradient flex min-h-screen items-center justify-center">
        <div className="rail-panel flex flex-col items-center gap-5 px-12 py-14 animate-scale-in">
          <Image
            src="/neurorail-logo.svg"
            alt="NeuroRail logo"
            width={72}
            height={72}
            className="h-18 w-18"
            style={{ animation: "breathe 2s ease-in-out infinite" }}
          />
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-accent">
              NeuroRail
            </p>
            <h1 className="mt-2 text-xl font-bold tracking-tight">Railway Safety Intelligence</h1>
          </div>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-accent/15">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                animation: "slideProgress 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              }}
            />
          </div>
          <style>{`
            @keyframes slideProgress {
              from { width: 0%; }
              to   { width: 100%; }
            }
          `}</style>
        </div>
      </main>
    );
  }

  return (
    <main className="rail-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <section className="rail-panel w-full max-w-5xl p-6 sm:p-10 animate-fade-in">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">

          {/* Left column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 animate-slide-up delay-0">
              <Image
                src="/neurorail-logo.svg"
                alt="NeuroRail logo"
                width={48}
                height={48}
                className="h-12 w-12"
              />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                NeuroRail
              </p>
            </div>

            <h1 className="text-4xl font-bold leading-tight sm:text-5xl tracking-tight animate-slide-up delay-1">
              Railway Safety Intelligence, Tuned For Two Roles.
            </h1>

            <p className="max-w-2xl text-base text-muted sm:text-lg animate-slide-up delay-2">
              Choose your access level to continue. Users receive alerts, search
              matches, and lost item tracking. Admins operate surveillance,
              verification, and operational controls.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/login?role=user"
                className="group rail-panel rail-panel-hover block p-5 transition-all duration-200 hover:-translate-y-1 animate-slide-up delay-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                  User Portal
                </p>
                <h2 className="mt-2 text-2xl font-bold">User</h2>
                <p className="mt-2 text-sm text-muted">
                  View alerts, upload lost item evidence, and track AI matches.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Continue →
                </span>
              </Link>

              <Link
                href="/login?role=admin"
                className="group rail-panel rail-panel-hover block p-5 transition-all duration-200 hover:-translate-y-1 animate-slide-up delay-4"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-warning">
                  Operations Console
                </p>
                <h2 className="mt-2 text-2xl font-bold">Admin</h2>
                <p className="mt-2 text-sm text-muted">
                  Manage cameras, alerts, users, and verification workflows.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-warning opacity-0 transition-opacity group-hover:opacity-100">
                  Continue →
                </span>
              </Link>
            </div>
          </div>

          {/* Right column — Access Matrix */}
          <div className="rail-panel flex flex-col justify-between p-6 animate-slide-up delay-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Access Matrix Snapshot
              </p>
              <ul className="mt-5 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="rail-dot mt-1 bg-accent shrink-0" style={{ animation: "pulseRing 2s ease-out infinite" }} />
                  <span>Users: Alerts, AI results, Lost &amp; Found upload</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="rail-dot mt-1 bg-warning shrink-0" style={{ animation: "pulseRing 2s ease-out infinite 0.3s" }} />
                  <span>Admins: Live surveillance and camera control</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="rail-dot mt-1 bg-slate-700 shrink-0" />
                  <span>Shared: Authentication and alert visibility</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
              Already have access? Continue with login.
              <Link className="ml-2 font-semibold text-accent hover:underline" href="/login">
                Open Login →
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
