import AppShell from "@/components/layout/app-shell";

export default function UserHomePage() {
  return (
    <AppShell
      role="user"
      title="Hey User"
      subtitle="Your safety feed, alerts, and quick actions in one view."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Critical Alerts", "3"],
          ["Active Cases", "12"],
          ["AI Matches Today", "8"],
        ].map(([label, value]) => (
          <article key={label} className="rail-panel p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <article className="rail-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Navigation
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            "View Results",
            "Submit Lost Item",
            "Open Profile Filters",
          ].map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-lg border border-line bg-surface px-3 py-3 text-left text-sm font-semibold"
            >
              {action}
            </button>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
