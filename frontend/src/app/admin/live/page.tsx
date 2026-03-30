"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAdminLiveSummary } from "@/lib/api/admin-service";
import type { AdminLiveSummary } from "@/lib/api/types";

const cameraGroups = ["Platform", "Concourse", "Entrances", "Staff zones"];

export default function AdminLivePage() {
  const [summary, setSummary] = useState<AdminLiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  const stats = [
    {
      key: "total",
      label: "Total alerts",
      value: summary?.total_alerts,
    },
    {
      key: "recent",
      label: "Alerts (last hour)",
      value: summary?.recent_alerts,
    },
    {
      key: "detections",
      label: "Detections",
      value: summary?.total_detections,
    },
    {
      key: "predictions",
      label: "Predictions",
      value: summary?.total_predictions,
    },
  ];

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminLiveSummary();
      if (mountedRef.current) {
        setSummary(data);
      }
    } catch (loadError) {
      if (mountedRef.current) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load live summary.";
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadSummary();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSummary]);

  return (
    <AppShell
      role="admin"
      title="Live Surveillance"
      subtitle="Monitor cameras and filter active/offline streams."
    >
      <article className="rail-panel p-5">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-24 rounded bg-slate-200/80" />
                  <div className="h-7 w-16 rounded bg-slate-200/80" />
                </div>
              </div>
            ))
            : stats.map((item) => (
              <div key={item.key} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-xs uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {error ? "!" : item.value ?? 0}
                </p>
              </div>
            ))}
        </div>

        {error ? (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
          >
            <span>Live summary failed to load: {error}</span>
            <button
              type="button"
              onClick={loadSummary}
              className="rounded-full border border-warning/60 bg-white/70 px-3 py-1 text-xs"
              disabled={loading}
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Active cameras",
            "Offline cameras",
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-2">
          {cameraGroups.map((group, index) => (
            <div key={group} className="rounded-xl border border-line bg-surface p-4">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-slate-200/80" />
                    <div className="h-5 w-16 rounded-full bg-slate-200/80" />
                  </div>
                  <div className="h-32 rounded-lg bg-slate-200/80" />
                  <div className="flex items-center justify-between text-xs">
                    <div className="h-3 w-24 rounded bg-slate-200/80" />
                    <div className="h-3 w-12 rounded bg-slate-200/80" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{group}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${index % 2 === 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {index % 2 === 0 ? "LIVE" : "OFFLINE"}
                    </span>
                  </div>
                  <div className="mt-3 h-32 rounded-lg bg-slate-200/70" />
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>Updated moments ago</span>
                    <span>Zone {index + 1}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
