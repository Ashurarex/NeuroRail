"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import { getAuthRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { ReportsSummary } from "@/lib/api/types";

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
    { label: "Total Alerts", value: summary?.total ?? 0 },
    { label: "High Priority", value: summary?.high ?? 0 },
    { label: "Medium Priority", value: summary?.medium ?? 0 },
  ];

  return (
    <AppShell
      role={role}
      title="Hey User"
      subtitle="Your safety feed, alerts, and quick actions in one view."
    >
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <article key={tile.label} className="rail-panel p-4">
            <p className="text-sm text-muted">{tile.label}</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "--" : tile.value}
            </p>
          </article>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-warning">{error}</p>
      ) : null}

      <article className="rail-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Navigation
        </p>
        <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => router.push(action.href)}
              className="rounded-lg border border-line bg-surface px-3 py-3 text-left text-sm font-semibold"
            >
              {action.label}
            </button>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
