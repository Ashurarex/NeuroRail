"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { deleteAlert, fetchAlerts } from "@/lib/api/alerts-service";
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
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState<Set<string>>(new Set());
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

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return alerts;
    }
    return alerts.filter((row) => {
      const objectValue = row.object_type.toLowerCase();
      return row.id.toLowerCase().includes(term) || objectValue.includes(term);
    });
  }, [alerts, search]);

  async function handleResolve(alertId: string) {
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((item) => item.id !== alertId));
    } catch (resolveError) {
      const message =
        resolveError instanceof Error ? resolveError.message : "Failed to resolve alert.";
      setError(message);
    }
  }

  function handleVerify(alertId: string) {
    setVerified((prev) => new Set([...prev, alertId]));
  }

  return (
    <AppShell
      role="admin"
      title="Alerts Management"
      subtitle="Review, filter, verify, and resolve operational alerts."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search alerts by ID or object"
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-3 px-2 font-semibold text-muted">Alert ID</th>
                <th className="py-3 px-2 font-semibold text-muted">Level</th>
                <th className="py-3 px-2 font-semibold text-muted">Category</th>
                <th className="py-3 px-2 font-semibold text-muted">Status</th>
                <th className="py-3 px-2 font-semibold text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={5}>
                    Loading alerts...
                  </td>
                </tr>
              ) : null}

              {!loading && !error && alerts.length === 0 ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={5}>
                    No alerts found.
                  </td>
                </tr>
              ) : null}

              {!loading && !error
                ? filteredAlerts.map((row) => (
                  <tr key={row.id} className="border-b border-line/50 hover:bg-amber-50/30 transition">
                    <td className="py-3 px-2 font-mono text-xs">{row.id.slice(0, 12)}...</td>
                    <td className="py-3 px-2">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize ${row.alert_level === 'high' ? 'bg-red-100 text-red-700' :
                          row.alert_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {row.alert_level}
                      </span>
                    </td>
                    <td className="py-3 px-2 capitalize">{row.object_type}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-semibold ${verified.has(row.id) ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                        {verified.has(row.id) ? "✓ Verified" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify(row.id)}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${verified.has(row.id)
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-line hover:bg-amber-50'
                            }`}
                        >
                          {verified.has(row.id) ? "Verified" : "Verify"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(row.id)}
                          className="rounded-lg bg-accent px-2 py-1 text-xs text-white hover:bg-accent-strong transition"
                        >
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
