"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clearAuthSession, type AppRole } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
};

type AppShellProps = {
  role: AppRole;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const USER_NAV: NavItem[] = [
  { label: "Home", href: "/user/home" },
  { label: "Results", href: "/user/results" },
  { label: "Lost & Found", href: "/user/lost-found" },
  { label: "Profile", href: "/user/profile" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Live Surveillance", href: "/admin/live" },
  { label: "Alerts", href: "/admin/alerts" },
  { label: "Lost & Found", href: "/admin/lost-found" },
  { label: "Logs", href: "/admin/logs" },
  { label: "Users", href: "/admin/users" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AppShell({ role, title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navItems = useMemo(() => (role === "admin" ? ADMIN_NAV : USER_NAV), [role]);

  function handleLogout() {
    clearAuthSession();
    router.push("/");
  }

  return (
    <main className="rail-gradient min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[250px_1fr]">
        <aside className="rail-panel hidden p-4 lg:block">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/neurorail-logo.svg"
              alt="NeuroRail logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              {role === "admin" ? "Admin Console" : "User Console"}
            </p>
          </Link>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-accent text-white" : "hover:bg-amber-50"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold"
            >
              Logout
            </button>
          </nav>
        </aside>

        <div className="space-y-4">
          <header className="rail-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Link href="/" className="shrink-0">
                  <Image
                    src="/neurorail-logo.svg"
                    alt="NeuroRail logo"
                    width={40}
                    height={40}
                    className="h-10 w-10"
                  />
                </Link>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">NeuroRail</p>
                  <h1 className="mt-1 text-2xl font-bold">{title}</h1>
                  <p className="mt-1 text-sm text-muted">{subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold lg:hidden"
                onClick={() => setOpen((prev) => !prev)}
              >
                Menu
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-sm"
                placeholder="Search alerts, cameras, results..."
              />
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                {role === "admin" ? "Control" : "View"} Mode
              </span>
            </div>
            {open ? (
              <nav className="mt-3 grid gap-2 rounded-lg border border-line bg-panel p-3 lg:hidden">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-accent text-white" : "bg-amber-50"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                >
                  Logout
                </button>
              </nav>
            ) : null}
          </header>

          <section className="space-y-4">{children}</section>
        </div>
      </div>
    </main>
  );
}
