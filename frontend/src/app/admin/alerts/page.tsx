"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAlerts } from "@/lib/api/alerts-service";
import type { AlertRecord } from "@/lib/api/types";

const severityFilters = [
  { label: "All", value: "" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const objectFilters = [
  { label: "All", value: "" },
  { label: "Object on track", value: "object on track" },
  { label: "Unattended bag", value: "unattended bag" },
];

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [severity, setSeverity] = useState("");
  const [objectType, setObjectType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilters = useMemo(
    () => ({ severity: severity || undefined, objectType: objectType || undefined }),
    [severity, objectType],
  );

  useEffect(() => {
    let mounted = true;

    async function loadAlerts() {
      setLoading(true);
      setError(null);

      try {
        const rows = await fetchAlerts(activeFilters);
        if (mounted) {
          setAlerts(rows);
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "Failed to load alerts.";
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
  }, [activeFilters]);

  return (
    <AppShell
      role="admin"
      title="Alerts Management"
      subtitle="Review, filter, verify, and resolve operational alerts."
    >
      <article className="rail-panel p-5">
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {severityFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setSeverity(filter.value)}
                className={`rounded-full border px-3 py-1 text-sm ${severity === filter.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line bg-surface"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {objectFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setObjectType(filter.value)}
                className={`rounded-full border px-3 py-1 text-sm ${objectType === filter.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line bg-surface"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2">Alert</th>
                <th className="py-2">Level</th>
                <th className="py-2">Category</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-muted" colSpan={5}>
                    Loading alerts...
                  </td>
                </tr>
              ) : null}

              {!loading && !error && alerts.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted" colSpan={5}>
                    No alerts found.
                  </td>
                </tr>
              ) : null}

              {!loading && !error
                ? alerts.map((row) => (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-3 font-mono">{row.id}</td>
                    <td className="py-3 capitalize">{row.alert_level}</td>
                    <td className="py-3 capitalize">{row.object_type}</td>
                    <td className="py-3">Active</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-line px-2 py-1 text-xs">
                          Verify
                        </button>
                        <button className="rounded-lg bg-accent px-2 py-1 text-xs text-white">
                          Resolve
                        </button>
                      </div>
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
