import AppShell from "@/components/layout/app-shell";

export default function AdminDashboardPage() {
  return (
    <AppShell
      role="admin"
      title="Dashboard"
      subtitle="Main control panel for station safety operations."
    >
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Active cameras", "28"],
          ["Open alerts", "11"],
          ["Resolved today", "19"],
          ["Pending matches", "7"],
        ].map(([label, value]) => (
          <article key={label} className="rail-panel p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <article className="rail-panel p-5">
        <h2 className="text-lg font-semibold">Recent Alerts</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {[
            "Critical: Object on track at Platform 1",
            "Active: Unauthorized zone breach at Staff Entry",
            "Active: Unattended bag at Gate C",
          ].map((item) => (
            <li key={item} className="rounded-lg border border-line bg-surface px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </article>
    </AppShell>
  );
}
