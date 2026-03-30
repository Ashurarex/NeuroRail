"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import type { AlertRecord } from "@/lib/api/types";

export default function UserResultsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppShell
      role="user"
      title="AI Results"
      subtitle="Matching items detected by surveillance and uploads."
    >
      <article className="rail-panel p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            "High confidence",
            "Latest first",
            "Nearest station",
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2">Match ID</th>
                <th className="py-2">Item</th>
                <th className="py-2">Confidence</th>
                <th className="py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-muted" colSpan={4}>
                    Loading AI results...
                  </td>
                </tr>
              ) : null}

              {!loading && error ? (
                <tr>
                  <td className="py-4 text-warning" colSpan={4}>
                    Error: {error}
                  </td>
                </tr>
              ) : null}

              {!loading && !error && alerts.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted" colSpan={4}>
                    No results yet.
                  </td>
                </tr>
              ) : null}

              {!loading && !error
                ? alerts.map((row) => (
                    <tr key={row.id} className="border-b border-line/70">
                      <td className="py-3 font-mono">{row.id}</td>
                      <td className="py-3 capitalize">{row.object_type}</td>
                      <td className="py-3">{Math.round(row.confidence * 100)}%</td>
                      <td className="py-3 capitalize">{row.alert_level}</td>
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
