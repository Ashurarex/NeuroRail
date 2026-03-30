"use client";

import { FormEvent, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { submitLostItemImage } from "@/lib/api/lost-found-service";

export default function UserLostFoundPage() {
  const [status, setStatus] = useState("Ready");
  const [location, setLocation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select an image before submitting.");
      return;
    }

    setPending(true);
    setError(null);
    setStatus("Submitting request...");

    try {
      const response = await submitLostItemImage(selectedFile);
      const locationSuffix = location.trim() ? ` at ${location.trim()}` : "";
      setStatus(
        `Submitted${locationSuffix}. Detection processed with alert ${response.alert.id}.`,
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit the lost item request.";
      setError(message);
      setStatus("Submission failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell
      role="user"
      title="Lost & Found"
      subtitle="Upload item evidence and request AI-assisted matching."
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

        {error ? <p className="text-sm text-warning">Error: {error}</p> : null}
        <p className="text-sm text-muted">Status: {status}</p>
      </form>
    </AppShell>
  );
}
