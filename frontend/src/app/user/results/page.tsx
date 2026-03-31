"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import type { AlertRecord } from "@/lib/api/types";

export default function UserResultsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [stationFilter, setStationFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function loadAlerts() {
      setLoading(true);
      setError(null);

      try {
        const rows = await fetchAlerts();
        if (mounted) {
          setAlerts(rows);
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to fetch AI results.";
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredAlerts = alerts.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      row.id.toLowerCase().includes(term) ||
      row.object_type.toLowerCase().includes(term);

    const matchesConfidence =
      confidenceFilter === "all" ||
      (confidenceFilter === "high" && row.confidence >= 0.8) ||
      (confidenceFilter === "medium" && row.confidence >= 0.5 && row.confidence < 0.8) ||
      (confidenceFilter === "low" && row.confidence < 0.5);

    return matchesSearch && matchesConfidence;
  }).sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    }
    return a.id.localeCompare(b.id);
  });

  return (
    <AppShell
      role="user"
      title="AI Results"
      subtitle="Matching items detected by surveillance and uploads."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search results by ID or item"
    >
      <article className="rail-panel p-5 animate-slide-up">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "High confidence", value: "high" },
            { label: "Latest first", value: "latest" },
            { label: "Nearest station", value: "nearest" },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                if (filter.label === "High confidence") {
                  setConfidenceFilter(confidenceFilter === "high" ? "all" : "high");
                } else if (filter.label === "Latest first") {
                  setSortBy(sortBy === "latest" ? "id" : "latest");
                } else if (filter.label === "Nearest station") {
                  setStationFilter(stationFilter === "nearest" ? "all" : "nearest");
                }
              }}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition active:scale-95 ${(filter.label === "High confidence" && confidenceFilter === "high") ||
                  (filter.label === "Latest first" && sortBy === "latest") ||
                  (filter.label === "Nearest station" && stationFilter === "nearest")
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface hover:border-line-strong"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="rail-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Match ID</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Item</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Confidence</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-line/30">
                    <td className="py-3 px-3"><div className="skeleton h-3 w-24" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-3 w-14" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-3 w-10" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-5 w-14 rounded-full" /></td>
                  </tr>
                ))
              ) : null}

              {!loading && error ? (
                <tr>
                  <td className="py-4 px-2 text-warning" colSpan={4}>
                    Error: {error}
                  </td>
                </tr>
              ) : null}

              {!loading && !error && filteredAlerts.length === 0 ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>
                    No results yet.
                  </td>
                </tr>
              ) : null}

              {!loading && !error
                ? filteredAlerts.map((row) => (
                  <tr key={row.id} className="border-b border-line/30 transition">
                    <td className="py-3 px-3 font-mono text-xs text-muted">{row.id.slice(0, 12)}…</td>
                    <td className="py-3 px-3 capitalize">{row.object_type}</td>
                    <td className="py-3 px-3 font-semibold text-accent">{Math.round(row.confidence * 100)}%</td>
                    <td className="py-3 px-3">
                      <span className={`rail-badge capitalize ${row.alert_level === 'high' ? 'bg-red-100 text-red-700' :
                          row.alert_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {row.alert_level}
                      </span>
                    </td>
                  </tr>
                ))
                : null}
            </tbody>
          </table>
        </div>
      </article>
    </AppShell>
  );
}
