import AppShell from "@/components/layout/app-shell";

export default function AdminSettingsPage() {
  return (
    <AppShell
      role="admin"
      title="Settings"
      subtitle="Configure system, alerts, camera setup, and role access."
    >
      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Configuration Blocks</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            "System settings",
            "Alerts configuration",
            "Camera configuration",
            "User management access",
          ].map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-lg border border-line bg-surface px-3 py-3 text-left text-sm font-semibold"
            >
              {item}
            </button>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
