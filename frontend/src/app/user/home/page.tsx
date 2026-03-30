"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import type { ReportsSummary } from "@/lib/api/types";

export default function UserHomePage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      role="user"
      title="Hey User"
      subtitle="Your safety feed, alerts, and quick actions in one view."
    >
      <div className="grid gap-4 md:grid-cols-3">
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
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            "View Results",
            "Submit Lost Item",
            "Open Profile Filters",
          ].map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-lg border border-line bg-surface px-3 py-3 text-left text-sm font-semibold"
            >
              {action}
            </button>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
