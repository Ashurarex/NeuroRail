"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import {
  fetchAdminLostFoundCases,
  updateLostFoundStatus,
} from "@/lib/api/lost-found-service";
import type { LostFoundCase, LostFoundStatus } from "@/lib/api/types";

const statusFlow: { label: string; value?: LostFoundStatus }[] = [
  { label: "All" },
  { label: "Pending", value: "pending" },
  { label: "Matched", value: "matched" },
  { label: "Verified", value: "verified" },
  { label: "Closed", value: "closed" },
];

const STATUS_COLORS: Record<LostFoundStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  matched: "bg-blue-100 text-blue-700",
  verified: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-700",
};

export default function AdminLostFoundPage() {
  const [cases, setCases] = useState<LostFoundCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LostFoundStatus | undefined>(
    undefined,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminLostFoundCases(statusFilter);
      setCases(rows);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load cases.";
      setError(message);
      console.error("Failed to load cases:", loadError);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadCases();
  }, [loadCases, refreshKey]);

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadCases();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadCases]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return cases;
    }
    return cases.filter((item) => {
      const locationValue = item.location?.toLowerCase() ?? "";
      return item.id.toLowerCase().includes(term) || locationValue.includes(term);
    });
  }, [cases, search]);

  async function handleStatusChange(caseId: string, status: LostFoundStatus) {
    try {
      const updated = await updateLostFoundStatus(caseId, status);
      setCases((prev) => prev.map((item) => (item.id === caseId ? updated : item)));
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Failed to update case.";
      setError(message);
    }
  }

  return (
    <AppShell
      role="admin"
      title="Lost & Found Verification"
      subtitle="Validate AI matches and progress each case through closure."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search cases by ID or location"
    >
      <article className="rail-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Pending Uploads</h2>
            <p className="mt-1 text-sm text-muted">
              Review cases and move them through the verification pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={loading}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusFlow.map((state) => (
            <button
              key={state.label}
              type="button"
              onClick={() => setStatusFilter(state.value)}
              className={`rounded-full border px-3 py-1 text-sm ${statusFilter === state.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-line bg-surface"
                }`}
            >
              {state.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="text-sm text-muted">Loading cases...</div>
          ) : null}
          {!loading && filteredCases.length === 0 ? (
            <div className="text-sm text-muted">No cases found.</div>
          ) : null}
          {!loading
            ? filteredCases.map((item) => (
              <div key={item.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">Case {item.id.slice(0, 8)}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[item.status]
                      }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Location: {item.location ?? "-"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, "matched")}
                    className="rounded-lg border border-line px-2 py-1 text-xs"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, "verified")}
                    className="rounded-lg bg-accent px-2 py-1 text-xs text-white"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(item.id, "closed")}
                    className="rounded-lg border border-line px-2 py-1 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))
            : null}
        </div>
      </article>
    </AppShell>
  );
}
