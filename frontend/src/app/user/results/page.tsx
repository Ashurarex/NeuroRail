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
      <article className="rail-panel p-5">
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
              className={`rounded-full border px-3 py-1 text-sm transition ${(filter.label === "High confidence" && confidenceFilter === "high") ||
                  (filter.label === "Latest first" && sortBy === "latest") ||
                  (filter.label === "Nearest station" && stationFilter === "nearest")
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface hover:border-accent"
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-2 font-semibold text-muted">Match ID</th>
                <th className="py-3 px-2 font-semibold text-muted">Item</th>
                <th className="py-3 px-2 font-semibold text-muted">Confidence</th>
                <th className="py-3 px-2 font-semibold text-muted">Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>
                    Loading AI results...
                  </td>
                </tr>
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
                  <tr key={row.id} className="border-b border-line/50 hover:bg-amber-50/30 transition">
                    <td className="py-3 px-2 font-mono text-xs">{row.id.slice(0, 12)}...</td>
                    <td className="py-3 px-2 capitalize">{row.object_type}</td>
                    <td className="py-3 px-2 font-semibold text-blue-600">{Math.round(row.confidence * 100)}%</td>
                    <td className="py-3 px-2">
                      <span className="inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize bg-amber-100 text-amber-700">
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
