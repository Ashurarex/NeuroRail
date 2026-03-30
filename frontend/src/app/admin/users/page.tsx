"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { fetchAdminUsers } from "@/lib/api/admin-service";
import type { AdminUserRecord } from "@/lib/api/types";

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const users = await fetchAdminUsers();
        if (mounted) {
          setRows(users);
        }
      } catch (loadError) {
        if (mounted) {
          const message =
            loadError instanceof Error ? loadError.message : "Failed to load users.";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

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
              {loading ? (
                <tr>
                  <td className="py-3 text-muted" colSpan={4}>Loading users...</td>
                </tr>
              ) : null}
              {!loading && error ? (
                <tr>
                  <td className="py-3 text-warning" colSpan={4}>Error: {error}</td>
                </tr>
              ) : null}
              {!loading && !error && rows.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted" colSpan={4}>No users found.</td>
                </tr>
              ) : null}
              {!loading && !error
                ? rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-3">{row.email}</td>
                    <td className="py-3 capitalize">{row.role}</td>
                    <td className="py-3">{row.last_login ?? "-"}</td>
                    <td className="py-3 capitalize">{row.status}</td>
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
