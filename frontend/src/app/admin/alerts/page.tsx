import AppShell from "@/components/layout/app-shell";

const rows = [
  { id: "A-981", level: "Critical", category: "Object on track", status: "Active" },
  { id: "A-984", level: "Active", category: "Unattended bag", status: "Active" },
  { id: "A-961", level: "Resolved", category: "Object on track", status: "Resolved" },
];

export default function AdminAlertsPage() {
  return (
    <AppShell
      role="admin"
      title="Alerts Management"
      subtitle="Review, filter, verify, and resolve operational alerts."
    >
      <article className="rail-panel p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            "Critical",
            "Active",
            "Resolved",
            "Object on track",
            "Unattended bag",
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2">Alert</th>
                <th className="py-2">Level</th>
                <th className="py-2">Category</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line/70">
                  <td className="py-3 font-mono">{row.id}</td>
                  <td className="py-3">{row.level}</td>
                  <td className="py-3">{row.category}</td>
                  <td className="py-3">{row.status}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-line px-2 py-1 text-xs">Verify</button>
                      <button className="rounded-lg bg-accent px-2 py-1 text-xs text-white">Resolve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </AppShell>
  );
}
