"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import { fetchReportsSummary } from "@/lib/api/reports-service";
import { getAuthRole } from "@/lib/auth";
import { useAccuracySocket } from "@/lib/use-accuracy-socket";
import { useIntelSocket } from "@/lib/use-intel-socket";
import LiveMonitor from "@/components/LiveMonitor";
import RiskPanel from "@/components/RiskPanel";
import AlertsPanel from "@/components/AlertsPanel";
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

type DashboardTab = "overview" | "accuracy" | "intel";

function toneForMetric(value: number) {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-400";
  return "bg-red-500";
}

function textToneForMetric(value: number) {
  if (value >= 85) return "text-emerald-600";
  if (value >= 70) return "text-amber-600";
  return "text-red-600";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-12 rounded-lg border border-line bg-surface" />;
  }

  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - ((value - min) / span) * 100;
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full">
      <polyline
        fill="none"
        stroke="#14b8a6"
        strokeWidth="2"
        points={points.join(" ")}
      />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("admin");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showDetails, setShowDetails] = useState(false);

  const isAdmin = role === "admin";
  const tabs = useMemo<DashboardTab[]>(
    () => (isAdmin ? ["overview", "accuracy", "intel"] : ["overview"]),
    [isAdmin],
  );

  const { connected, metrics, history, latencyMs, averageAccuracy } = useAccuracySocket(
    isAdmin && activeTab === "accuracy",
  );
  const intelEnabled = isAdmin && activeTab === "intel";
  const {
    connected: intelConnected,
    behavior,
    prediction,
    alerts: intelAlerts,
    highestRiskTrack,
  } = useIntelSocket(intelEnabled);

  useEffect(() => {
    const userRole = getAuthRole();
    setRole(userRole);
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab !== "overview") {
      setActiveTab("overview");
    }
  }, [activeTab, isAdmin]);

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

  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Accuracy", value: metrics.accuracy },
      { label: "Precision", value: metrics.precision },
      { label: "Recall", value: metrics.recall },
      { label: "F1-score", value: metrics.f1_score },
    ];
  }, [metrics]);

  return (
    <AppShell
      role={role}
      title="Dashboard"
      subtitle="Main control panel for station safety operations."
    >
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${activeTab === tab
              ? "border-accent bg-accent/10 text-accent"
              : "border-line bg-surface text-muted"
              }`}
          >
            {tab === "overview"
              ? "Overview"
              : tab === "accuracy"
                ? "Live Accuracy"
                : "Safety Intelligence"}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
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
                    className={`rounded-xl border border-line bg-surface px-4 py-3 flex items-center gap-3 transition hover:bg-accent/3 animate-slide-up delay-${Math.min(i, 5)}`}
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
        </>
      ) : activeTab === "accuracy" ? (
        <article className="rail-panel p-5 animate-slide-up delay-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Live Accuracy</h2>
              <p className="mt-1 text-sm text-muted">
                Rolling accuracy metrics based on recent admin verifications.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-2 text-xs font-semibold ${connected ? "text-emerald-600" : "text-muted"}`}>
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {connected ? "Live stream" : "Connecting"}
              </span>
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
              >
                {showDetails ? "Hide details" : "Show detailed metrics"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricCards.length === 0 ? (
              <div className="text-sm text-muted">Waiting for accuracy data...</div>
            ) : (
              metricCards.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{metric.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${textToneForMetric(metric.value)}`}>
                      {metric.value.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted">target 90%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-alt">
                    <div
                      className={`h-2 rounded-full ${toneForMetric(metric.value)}`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Accuracy trend</p>
                <span className="text-xs text-muted">
                  Avg {averageAccuracy ?? 0}%
                </span>
              </div>
              <div className="mt-3">
                <Sparkline values={history} />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold">Detection health</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Total detections</span>
                  <span className="font-semibold">{metrics?.total_detections ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Correct</span>
                  <span className="font-semibold text-emerald-600">{metrics?.correct ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Incorrect</span>
                  <span className="font-semibold text-red-600">{metrics?.incorrect ?? 0}</span>
                </div>
                {showDetails ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Latency</span>
                    <span className="font-semibold">{latencyMs ?? 0} ms</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      ) : (
        <article className="rail-panel p-5 animate-slide-up delay-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Safety Intelligence</h2>
              <p className="mt-1 text-sm text-muted">
                Real-time behavior monitoring, predictive risks, and active alerts.
              </p>
            </div>
            <span className={`flex items-center gap-2 text-xs font-semibold ${intelConnected ? "text-emerald-600" : "text-muted"}`}>
              <span className={`h-2 w-2 rounded-full ${intelConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {intelConnected ? "Live feed" : "Connecting"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <LiveMonitor behavior={behavior} />
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-sm font-semibold">Highest Risk Passenger</p>
                {highestRiskTrack ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-line px-2 py-1">
                      ID {highestRiskTrack.id}
                    </span>
                    <span className="rounded-full border border-line px-2 py-1">
                      {highestRiskTrack.movement_pattern}
                    </span>
                    <span className="rounded-full border border-line px-2 py-1">
                      Risk {(highestRiskTrack.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">No high-risk passengers yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <RiskPanel prediction={prediction} />
              <AlertsPanel alerts={intelAlerts} />
            </div>
          </div>
        </article>
      )}
    </AppShell>
  );
}
