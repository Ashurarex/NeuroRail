"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import { getAuthRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import type { AlertRecord, ReportsSummary } from "@/lib/api/types";

const PRIORITY_MAP: Record<string, string> = {
  "Total alerts": "",
  "High priority": "high",
  "Medium priority": "medium",
  "Low priority": "low",
};

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-blue-500",
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("admin");

  useEffect(() => {
    const userRole = getAuthRole();
    setRole(userRole);
  }, []);

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
          setAlerts(alertRows.slice(0, 5));
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
      role={role}
      title="Dashboard"
      subtitle="Main control panel for station safety operations."
    >
      {/* ── Stat tiles ─────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <article
            key={tile.label}
            className={`rail-panel stat-card p-4 animate-slide-up delay-${i}`}
            data-priority={PRIORITY_MAP[tile.label] || undefined}
          >
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-8 w-16" />
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

      {/* ── Recent Alerts ──────────────────────────────────────────── */}
      <article className="rail-panel p-5 animate-slide-up delay-4">
        <h2 className="text-lg font-bold tracking-tight">Recent Alerts</h2>
        {error ? (
          <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning animate-slide-up">
            {error}
          </div>
        ) : null}
        <ul className="mt-3 space-y-2 text-sm">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <li key={`sk-${i}`} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-2 w-2 rounded-full shrink-0" />
                  <div className="skeleton h-3 w-48" />
                </div>
              </li>
            ))
          ) : null}
          {!loading && !error && alerts.length === 0 ? (
            <li className="rounded-xl border border-line bg-surface px-4 py-3 text-muted">
              No alerts yet.
            </li>
          ) : null}
          {!loading && !error
            ? alerts.map((alert, i) => (
              <li
                key={alert.id}
                className={`rounded-xl border border-line bg-surface px-4 py-3 flex items-center gap-3 transition hover:bg-accent/[0.03] animate-slide-up delay-${Math.min(i, 5)}`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[alert.alert_level] ?? "bg-slate-400"}`} />
                <span className="font-medium capitalize">{alert.alert_level}</span>
                <span className="text-muted mx-1">—</span>
                <span className="capitalize">{alert.object_type}</span>
                <span className="ml-auto text-xs text-muted font-mono">
                  {alert.id.slice(0, 8)}
                </span>
              </li>
            ))
            : null}
        </ul>
      </article>
    </AppShell>
  );
}
