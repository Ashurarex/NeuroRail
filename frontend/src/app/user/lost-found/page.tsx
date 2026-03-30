"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import {
  createLostFoundCase,
  fetchMyLostFoundCases,
} from "@/lib/api/lost-found-service";
import type { LostFoundCase } from "@/lib/api/types";

export default function UserLostFoundPage() {
  const [location, setLocation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cases, setCases] = useState<LostFoundCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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

  const loadCases = async () => {
    setLoadingCases(true);
    setError(null);
    try {
      const rows = await fetchMyLostFoundCases();
      setCases(rows);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load your cases.";
      setError(message);
      console.error("Failed to load cases:", loadError);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [refreshKey]);

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
  }, []);

  // Auto-clear success notice after 4 seconds
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select an image before submitting.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createLostFoundCase(selectedFile, location);
      const locationSuffix = location.trim() ? ` at ${location.trim()}` : "";
      setNotice(`Submitted${locationSuffix}. Case ${response.id.slice(0, 8)} created.`);
      setCases((prev) => [response, ...prev]);
      setSelectedFile(null);
      setLocation("");
      // Clear file input display
      const fileInput = document.getElementById("item-image") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit the lost item request.";
      console.error("Submit error details:", {
        error: submitError,
        message,
        type: submitError instanceof Error ? submitError.constructor.name : typeof submitError,
      });
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell
      role="user"
      title="Lost & Found"
      subtitle="Upload item evidence and request AI-assisted matching."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search your cases by ID or location"
    >
      <form onSubmit={handleSubmit} className="rail-panel grid gap-4 p-5">
        <div className="grid gap-2">
          <label htmlFor="item-image" className="text-sm font-medium">
            Lost item image
          </label>
          <input
            id="item-image"
            type="file"
            accept="image/*"
            className="h-11 rounded-lg border border-line bg-surface px-3 py-2"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
            }}
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="location" className="text-sm font-medium">
            Last seen location
          </label>
          <input
            id="location"
            type="text"
            className="h-11 rounded-lg border border-line bg-surface px-3"
            placeholder="Platform 2, Concourse Gate B"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {pending ? "Submitting..." : "Submit Lost Item Request"}
        </button>

        {notice ? (
          <div className="rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}
      </form>

      <article className="rail-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">My Cases</h2>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={loadingCases}
            className="rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50"
          >
            {loadingCases ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error && !loadingCases ? (
          <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            {error}
          </div>
        ) : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-2 font-semibold text-muted">Case ID</th>
                <th className="py-3 px-2 font-semibold text-muted">Location</th>
                <th className="py-3 px-2 font-semibold text-muted">Status</th>
                <th className="py-3 px-2 font-semibold text-muted">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loadingCases ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>
                    Loading cases...
                  </td>
                </tr>
              ) : null}
              {!loadingCases && filteredCases.length === 0 ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>
                    No cases found.
                  </td>
                </tr>
              ) : null}
              {!loadingCases
                ? filteredCases.map((item) => (
                  <tr key={item.id} className="border-b border-line/50 hover:bg-amber-50/30 transition">
                    <td className="py-3 px-2 font-mono text-xs">{item.id.slice(0, 12)}...</td>
                    <td className="py-3 px-2">{item.location ?? "-"}</td>
                    <td className="py-3 px-2">
                      <span className="inline-block rounded-full px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 capitalize">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs">
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
