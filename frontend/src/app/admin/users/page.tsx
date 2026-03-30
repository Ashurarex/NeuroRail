import AppShell from "@/components/layout/app-shell";

export default function AdminUsersPage() {
  return (
    <AppShell
      role="admin"
      title="User Management"
      subtitle="View users, role matrix, status, and access permissions."
    >
      <article className="rail-panel p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2">User</th>
                <th className="py-2">Role</th>
                <th className="py-2">Last login</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["anita@neurorail.io", "User", "09:45", "Active"],
                ["ops.admin@neurorail.io", "Admin", "09:30", "Active"],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-line/70">
                  <td className="py-3">{row[0]}</td>
                  <td className="py-3">{row[1]}</td>
                  <td className="py-3">{row[2]}</td>
                  <td className="py-3">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </AppShell>
  );
}
