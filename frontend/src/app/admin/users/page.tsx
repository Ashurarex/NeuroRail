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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-2 text-left font-semibold text-muted">User</th>
                <th className="py-3 px-2 text-left font-semibold text-muted">Role</th>
                <th className="py-3 px-2 text-left font-semibold text-muted">Last Login</th>
                <th className="py-3 px-2 text-left font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>Loading users...</td>
                </tr>
              ) : null}
              {!loading && error ? (
                <tr>
                  <td className="py-4 px-2 text-warning" colSpan={4}>Error: {error}</td>
                </tr>
              ) : null}
              {!loading && !error && rows.length === 0 ? (
                <tr>
                  <td className="py-4 px-2 text-muted" colSpan={4}>No users found.</td>
                </tr>
              ) : null}
              {!loading && !error
                ? rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/50 hover:bg-amber-50/30 transition">
                    <td className="py-3 px-2 font-mono text-xs">{row.email}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize ${row.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        }`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs">{row.last_login ?? "-"}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}>
                        {row.status}
                      </span>
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
