"use client";

import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/app-shell";

const configBlocks = [
  { id: "system", label: "System settings", description: "Database, API, and backend config" },
  { id: "alerts", label: "Alerts configuration", description: "Alert rules and thresholds" },
  { id: "camera", label: "Camera configuration", description: "Camera setup and zones" },
  { id: "users", label: "User management access", description: "Roles and permissions" },
];

export default function AdminSettingsPage() {
  const router = useRouter();

  function handleBlockClick(id: string) {
    router.push(`/admin/settings/${id}`);
  }

  return (
    <AppShell
      role="admin"
      title="Settings"
      subtitle="Configure system, alerts, camera setup, and role access."
    >
      <article className="rail-panel p-5">
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
      </article>
    </AppShell>
  );
}
