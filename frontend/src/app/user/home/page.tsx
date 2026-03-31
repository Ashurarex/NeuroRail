"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import { getAuthRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { ReportsSummary } from "@/lib/api/types";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  "/user/results": (
    <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  "/user/lost-found": (
    <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  "/user/profile": (
    <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export default function UserHomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("user");

  useEffect(() => {
    const userRole = getAuthRole();
    setRole(userRole);
  }, []);

  const actions = useMemo(
    () => [
      { label: "View Results", href: "/user/results" },
      { label: "Submit Lost Item", href: "/user/lost-found" },
      { label: "Open Profile Filters", href: "/user/profile" },
    ],
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchReportsSummary();
        if (mounted) {
          setSummary(data);
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "Failed to load summary.";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const tiles = [
    { label: "Total Alerts", value: summary?.total ?? 0, priority: "" },
    { label: "High Priority", value: summary?.high ?? 0, priority: "high" },
    { label: "Medium Priority", value: summary?.medium ?? 0, priority: "medium" },
  ];

  return (
    <AppShell
      role={role}
      title="Hey User"
      subtitle="Your safety feed, alerts, and quick actions in one view."
    >
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile, i) => (
          <article
            key={tile.label}
            className={`rail-panel stat-card p-4 animate-slide-up delay-${i}`}
            data-priority={tile.priority || undefined}
          >
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-8 w-14" />
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tile.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{tile.value}</p>
              </>
            )}
          </article>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning animate-slide-up">
          {error}
        </div>
      ) : null}

      <article className="rail-panel p-5 animate-slide-up delay-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          Quick Actions
        </p>
        <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, i) => (
            <button
              key={action.href}
              type="button"
              onClick={() => router.push(action.href)}
              className={`group rail-panel rail-panel-hover flex items-center gap-3 px-4 py-4 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 animate-slide-up delay-${i + 3}`}
            >
              {ACTION_ICONS[action.href]}
              <span>{action.label}</span>
              <svg className="ml-auto h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
