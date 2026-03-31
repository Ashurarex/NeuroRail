"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { deleteAlert, deleteAllAlerts, fetchAlerts } from "@/lib/api/alerts-service";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

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

  async function handleDeleteAll() {
    // Two-step: first click arms the button; second click fires
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-disarm after 4 s if user doesn't confirm
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setConfirmDelete(false);
    setIsDeleting(true);
    setDeleteStatus(null);
    const ids = filteredAlerts.map((a) => a.id);
    try {
      const deleted = await deleteAllAlerts(ids);
      setAlerts((prev) => prev.filter((a) => !ids.includes(a.id)));
      if (deleted < ids.length) {
        setDeleteStatus(`${deleted} of ${ids.length} alerts deleted. Some failed.`);
      }
    } catch {
      setDeleteStatus("Delete all failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
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
      <article className="rail-panel p-5 animate-slide-up">
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {severityFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setSeverity(filter.value)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition active:scale-95 ${severity === filter.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface hover:border-line-strong"
                  }`}
              >
                {filter.label}
              </button>
            ))}

            {/* Delete All — right-aligned */}
            <div className="ml-auto flex items-center gap-2">
              {filteredAlerts.length > 0 && (
                <span className="text-xs text-muted">
                  {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
                </span>
              )}
              <button
                id="delete-all-alerts-btn"
                type="button"
                disabled={isDeleting || filteredAlerts.length === 0}
                onClick={handleDeleteAll}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  isDeleting
                    ? "cursor-not-allowed border-line bg-surface text-muted"
                    : confirmDelete
                    ? "border-red-400 bg-red-500 text-white animate-pulse"
                    : filteredAlerts.length === 0
                    ? "cursor-not-allowed border-line bg-surface text-muted"
                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500"
                }`}
              >
                {isDeleting ? (
                  <>
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <circle cx="12" cy="12" r="10" className="opacity-25" />
                      <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
                    </svg>
                    Deleting…
                  </>
                ) : confirmDelete ? (
                  <>⚠ Confirm delete all</>
                ) : (
                  <>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {objectFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setObjectType(filter.value)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition active:scale-95 ${objectType === filter.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface hover:border-line-strong"
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

        {deleteStatus ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{deleteStatus}</span>
            <button
              type="button"
              onClick={() => setDeleteStatus(null)}
              className="ml-3 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="rail-table w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Alert ID</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Level</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Category</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Status</th>
                <th className="py-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-line/30">
                    <td className="py-3 px-3"><div className="skeleton h-3 w-24" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-5 w-14 rounded-full" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-3 w-16" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-3 w-14" /></td>
                    <td className="py-3 px-3"><div className="skeleton h-6 w-28" /></td>
                  </tr>
                ))
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
                  <tr key={row.id} className="border-b border-line/30 transition">
                    <td className="py-3 px-3 font-mono text-xs text-muted">{row.id.slice(0, 12)}…</td>
                    <td className="py-3 px-3">
                      <span className={`rail-badge capitalize ${row.alert_level === 'high' ? 'bg-red-100 text-red-700' :
                          row.alert_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {row.alert_level}
                      </span>
                    </td>
                    <td className="py-3 px-3 capitalize">{row.object_type}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold ${verified.has(row.id) ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                        {verified.has(row.id) ? "✓ Verified" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVerify(row.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${verified.has(row.id)
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-line hover:bg-accent/5 hover:border-accent/30'
                            }`}
                        >
                          {verified.has(row.id) ? "Verified" : "Verify"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(row.id)}
                          className="rail-btn rail-btn-primary rounded-lg px-2.5 py-1 text-xs"
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
