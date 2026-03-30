"use client";

import { useState } from "react";
import AppShell from "@/components/layout/app-shell";

const configBlocks = [
  { id: "system", label: "System settings", description: "Database, API, and backend config" },
  { id: "alerts", label: "Alerts configuration", description: "Alert rules and thresholds" },
  { id: "camera", label: "Camera configuration", description: "Camera setup and zones" },
  { id: "users", label: "User management access", description: "Roles and permissions" },
];

export default function AdminSettingsPage() {
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  function handleBlockClick(id: string) {
    setActiveBlock(id);
  }

  const activeBlockData = configBlocks.find((b) => b.id === activeBlock);

  return (
    <AppShell
      role="admin"
      title="Settings"
      subtitle="Configure system, alerts, camera setup, and role access."
    >
      <article className="rail-panel p-5">
        {!activeBlock ? (
          <>
            <h2 className="text-lg font-semibold">Configuration Blocks</h2>
            <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {configBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => handleBlockClick(block.id)}
                  className="rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:bg-amber-50 hover:border-accent"
                >
                  <h3 className="font-semibold text-accent">{block.label}</h3>
                  <p className="mt-1 text-xs text-muted">{block.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-3 border-b border-line pb-4 mb-4">
              <button
                type="button"
                onClick={() => setActiveBlock(null)}
                className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-neutral-100 border border-line transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back to Settings
              </button>
              <h2 className="text-xl font-semibold">{activeBlockData?.label}</h2>
            </div>

            <div className="rounded-lg border border-line p-6 bg-surface">
              <h3 className="text-lg font-medium mb-2">{activeBlockData?.label}</h3>
              <p className="text-muted mb-6">{activeBlockData?.description}</p>

              {/* Placeholder content for the selected block */}
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-line rounded-lg bg-neutral-50">
                <p className="text-muted-foreground">
                  Configuration options for <span className="font-semibold">{activeBlockData?.label}</span> will be available here.
                </p>
                <div className="mt-4">
                  <button className="rounded bg-accent px-4 py-2 text-white hover:bg-accent/90 transition">
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </article>
    </AppShell>
  );
}
