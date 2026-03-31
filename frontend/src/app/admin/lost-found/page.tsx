"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import {
  fetchAdminLostFoundCases,
  fetchLostFoundMatches,
  updateLostFoundMatchStatus,
  updateLostFoundStatus,
} from "@/lib/api/lost-found-service";
import type {
  LostFoundCase,
  LostFoundMatch,
  LostFoundMatchStatus,
  LostFoundStatus,
} from "@/lib/api/types";
import { useLostFoundMatchSocket } from "@/lib/use-lost-found-match-socket";

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

const MATCH_STATUS_COLORS: Record<LostFoundMatchStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

function formatTimestamp(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.9) return "border-emerald-400/60";
  if (confidence >= 0.8) return "border-amber-300/70";
  return "border-line";
}

export default function AdminLostFoundPage() {
  const [cases, setCases] = useState<LostFoundCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LostFoundStatus | undefined>(
    undefined,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [matchesByCase, setMatchesByCase] = useState<Record<string, LostFoundMatch[]>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});
  const [matchError, setMatchError] = useState<string | null>(null);
  const { connected: matchConnected, events } = useLostFoundMatchSocket();

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

  const loadMatches = useCallback(async (caseId: string) => {
    setLoadingMatches((prev) => ({ ...prev, [caseId]: true }));
    setMatchError(null);
    try {
      const rows = await fetchLostFoundMatches(caseId);
      setMatchesByCase((prev) => ({ ...prev, [caseId]: rows }));
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load matches.";
      setMatchError(message);
    } finally {
      setLoadingMatches((prev) => ({ ...prev, [caseId]: false }));
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases, refreshKey]);

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

  useEffect(() => {
    if (!selectedCaseId && cases.length > 0) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  useEffect(() => {
    if (!selectedCaseId) return;
    void loadMatches(selectedCaseId);
  }, [selectedCaseId, loadMatches]);

  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    if (latest.case_id) {
      void loadMatches(latest.case_id);
    }
  }, [events, loadMatches]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return cases;
    }
    return cases.filter((item) => {
      const locationValue = item.location?.toLowerCase() ?? "";
      const objectValue = item.object_type?.toLowerCase() ?? "";
      return (
        item.id.toLowerCase().includes(term) ||
        locationValue.includes(term) ||
        objectValue.includes(term)
      );
    });
  }, [cases, search]);

  const activeCase = cases.find((item) => item.id === selectedCaseId) ?? null;
  const activeMatches = activeCase ? matchesByCase[activeCase.id] ?? [] : [];
  const activeMeta = activeCase
    ? [
      activeCase.color ? `Color: ${activeCase.color}` : null,
      activeCase.size ? `Size: ${activeCase.size}` : null,
    ].filter((item): item is string => Boolean(item))
    : [];

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

  async function handleMatchStatusChange(
    matchId: string,
    status: LostFoundMatchStatus,
    caseId: string,
  ) {
    try {
      const updated = await updateLostFoundMatchStatus(matchId, status);
      setMatchesByCase((prev) => ({
        ...prev,
        [caseId]: (prev[caseId] ?? []).map((match) =>
          match.id === matchId ? updated : match,
        ),
      }));
      if (status === "verified") {
        setCases((prev) =>
          prev.map((item) => (item.id === caseId ? { ...item, status: "verified" } : item)),
        );
      }
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Failed to update match.";
      setMatchError(message);
    }
  }

  return (
    <AppShell
      role="admin"
      title="Lost & Found Verification"
      subtitle="Validate AI matches and progress each case through closure."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search cases by ID, location, or object"
    >
      <article className="rail-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Matching Queue</h2>
            <p className="mt-1 text-sm text-muted">
              AI-matched detections stream in live. Verify or reject to close cases.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${matchConnected ? "text-emerald-600" : "text-muted"}`}>
              {matchConnected ? "Live updates connected" : "Waiting for live updates"}
            </span>
            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              disabled={loading}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="flex flex-col gap-3">
            {loading ? <div className="text-sm text-muted">Loading cases...</div> : null}
            {!loading && filteredCases.length === 0 ? (
              <div className="text-sm text-muted">No cases found.</div>
            ) : null}
            {!loading
              ? filteredCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`rounded-xl border p-3 text-left transition ${selectedCaseId === item.id
                    ? "border-accent bg-accent/10"
                    : "border-line bg-surface hover:border-line-strong"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Case {item.id.slice(0, 8)}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.object_type ?? "Unknown object"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.location ? `Location: ${item.location}` : "Location pending"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Reported: {formatTimestamp(item.reported_at ?? item.created_at)}
                  </p>
                </button>
              ))
              : null}
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            {!activeCase ? (
              <p className="text-sm text-muted">Select a case to view AI matches.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Case {activeCase.id.slice(0, 8)}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {activeCase.object_type ?? "Unknown object"}
                      {activeCase.description ? ` · ${activeCase.description}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {activeCase.location ?? "Location pending"} · Reported {formatTimestamp(activeCase.reported_at ?? activeCase.created_at)}
                    </p>
                    {activeMeta.length > 0 ? (
                      <p className="mt-1 text-xs text-muted">{activeMeta.join(" · ")}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeCase.id, "closed")}
                      className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    >
                      Mark closed
                    </button>
                  </div>
                </div>

                {/* Original Case Image */}
                {activeCase.image_url ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-muted">Reported Item</p>
                    <div className="relative overflow-hidden rounded-lg border border-line bg-surface-alt">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeCase.image_url}
                        alt="Lost item"
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}

                {matchError ? (
                  <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                    {matchError}
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="mb-3 text-sm font-semibold">AI Matches</p>
                  <div className="grid gap-3">
                    {loadingMatches[activeCase.id] ? (
                      <div className="text-sm text-muted">Loading matches...</div>
                    ) : null}
                    {!loadingMatches[activeCase.id] && activeMatches.length === 0 ? (
                      <div className="text-sm text-muted">No high-confidence matches yet.</div>
                    ) : null}
                    {activeMatches.map((match) => {
                      const detection = match.detection;
                      const confidencePct = Math.round(match.confidence * 100);
                      const bbox = detection.bbox ?? {};
                      const showOverlay =
                        !detection.snapshot_url &&
                        detection.image_url &&
                        detection.frame_width &&
                        detection.frame_height &&
                        typeof bbox.x === "number";

                      const previewUrl = detection.snapshot_url ?? detection.image_url;

                      return (
                        <article
                          key={match.id}
                          className={`rounded-xl border p-4 ${getConfidenceBadge(match.confidence)}`}
                        >
                          <div className="grid gap-4">
                            {/* Image */}
                            <div className="relative overflow-hidden rounded-lg border border-line bg-surface-alt">
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewUrl}
                                  alt="Detected object"
                                  className="h-48 w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-48 items-center justify-center text-xs text-muted">
                                  Snapshot unavailable
                                </div>
                              )}
                              {showOverlay ? (
                                <svg
                                  className="absolute inset-0 h-full w-full"
                                  viewBox={`0 0 ${detection.frame_width} ${detection.frame_height}`}
                                  preserveAspectRatio="none"
                                >
                                  <rect
                                    x={bbox.x}
                                    y={bbox.y}
                                    width={bbox.w}
                                    height={bbox.h}
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="4"
                                  />
                                </svg>
                              ) : null}
                            </div>

                            {/* Metadata */}
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold capitalize">{detection.label}</p>
                                  <p className="text-xs text-muted">Camera {detection.camera_id ?? "-"}</p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${MATCH_STATUS_COLORS[match.status]}`}
                                >
                                  {match.status}
                                </span>
                              </div>

                              <p className="text-xs text-muted">
                                {detection.location ?? "Location pending"} · {formatTimestamp(detection.detected_at)}
                              </p>

                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <span className="rounded-full border border-line px-2 py-1 text-center">
                                  Confidence {confidencePct}%
                                </span>
                                <span className="rounded-full border border-line px-2 py-1 text-center">
                                  Image {(match.image_similarity * 100).toFixed(0)}%
                                </span>
                                <span className="rounded-full border border-line px-2 py-1 text-center">
                                  Class {(match.label_match * 100).toFixed(0)}%
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                                <a
                                  href={detection.image_url ?? detection.snapshot_url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 rounded-lg border border-line px-3 py-2 text-center text-xs font-semibold hover:bg-slate-50 transition"
                                >
                                  View footage
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleMatchStatusChange(match.id, "verified", activeCase.id)}
                                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700 transition"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMatchStatusChange(match.id, "rejected", activeCase.id)}
                                  className="flex-1 rounded-lg border border-line px-3 py-2 text-center text-xs font-semibold hover:bg-rose-50 transition"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </article>
    </AppShell>
  );
}
