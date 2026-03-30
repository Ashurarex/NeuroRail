"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import type { AlertRecord, ReportsSummary } from "@/lib/api/types";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, alertRows] = await Promise.all([
          fetchReportsSummary(),
          fetchAlerts(),
        ]);

        if (mounted) {
          setSummary(summaryData);
          setAlerts(alertRows.slice(0, 3));
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "Failed to load dashboard.";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const tiles = [
    { label: "Total alerts", value: summary?.total ?? 0 },
    { label: "High priority", value: summary?.high ?? 0 },
    { label: "Medium priority", value: summary?.medium ?? 0 },
    { label: "Low priority", value: summary?.low ?? 0 },
  ];

  return (
    <AppShell
      role="admin"
      title="Dashboard"
      subtitle="Main control panel for station safety operations."
    >
      <div className="grid gap-4 md:grid-cols-4">
        {tiles.map((tile) => (
          <article key={tile.label} className="rail-panel p-4">
            <p className="text-sm text-muted">{tile.label}</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "--" : tile.value}
            </p>
          </article>
        ))}
      </div>

      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Recent Alerts</h2>
        {error ? (
          <p className="mt-3 text-sm text-warning">{error}</p>
        ) : null}
        <ul className="mt-3 space-y-3 text-sm">
          {loading ? (
            <li className="rounded-lg border border-line bg-surface px-3 py-2 text-muted">
              Loading recent alerts...
            </li>
          ) : null}
          {!loading && !error && alerts.length === 0 ? (
            <li className="rounded-lg border border-line bg-surface px-3 py-2 text-muted">
              No alerts yet.
            </li>
          ) : null}
          {!loading && !error
            ? alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-line bg-surface px-3 py-2"
              >
                {alert.alert_level.toUpperCase()}: {alert.object_type}
              </li>
            ))
            : null}
        </ul>
      </article>
    </AppShell>
  );
}
