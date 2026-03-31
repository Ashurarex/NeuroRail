"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clearAuthSession, type AppRole } from "@/lib/auth";

/* ── types ─────────────────────────────────────────────────────────── */

type NavItem = { label: string; href: string; icon: React.ReactNode };

type AppShellProps = {
  role: AppRole;
  title: string;
  subtitle: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
};

/* ── icons (inline SVG — 18×18, stroke-based) ──────────────────────── */

const sz = "h-[18px] w-[18px] shrink-0";

const icon = {
  grid: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  camera: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  ),
  bell: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  search: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  fileText: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  users: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  settings: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  home: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  results: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  user: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  logout: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg className={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

/* ── nav config ────────────────────────────────────────────────────── */

const USER_NAV: NavItem[] = [
  { label: "Home",        href: "/user/home",       icon: icon.home },
  { label: "Results",     href: "/user/results",    icon: icon.results },
  { label: "Lost & Found",href: "/user/lost-found", icon: icon.search },
  { label: "Profile",     href: "/user/profile",    icon: icon.user },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard",       href: "/admin/dashboard",  icon: icon.grid },
  { label: "Live Surveillance",href: "/admin/live",       icon: icon.camera },
  { label: "Alerts",          href: "/admin/alerts",     icon: icon.bell },
  { label: "Lost & Found",    href: "/admin/lost-found", icon: icon.search },
  { label: "Logs",            href: "/admin/logs",       icon: icon.fileText },
  { label: "Users",           href: "/admin/users",      icon: icon.users },
  { label: "Settings",        href: "/admin/settings",   icon: icon.settings },
];

/* ── component ─────────────────────────────────────────────────────── */

export default function AppShell({
  role,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const navItems = useMemo(() => (role === "admin" ? ADMIN_NAV : USER_NAV), [role]);

  function handleLogout() {
    clearAuthSession();
    router.push("/");
  }

  const homeHref = role === "admin" ? "/admin/dashboard" : "/user/home";

  return (
    <main className="rail-gradient h-dvh overflow-hidden flex flex-col p-3 sm:p-5">
      <div className="h-full min-h-0 grid w-full gap-4 lg:grid-cols-[260px_1fr]">

        {/* ─── Desktop sidebar ─────────────────────────────────────── */}
        <aside className="rail-panel hidden lg:flex flex-col p-4 animate-slide-in">
          {/* Logo */}
          <Link href={homeHref} className="flex items-center gap-2.5 px-1 group">
            <Image
              src="/neurorail-logo.svg"
              alt="NeuroRail logo"
              width={32}
              height={32}
              className="h-8 w-8 transition-transform group-hover:scale-105"
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent leading-none">
                NeuroRail
              </p>
              <p className="text-[9px] uppercase tracking-widest text-muted mt-0.5">
                {role === "admin" ? "Admin Console" : "User Console"}
              </p>
            </div>
          </Link>

          {/* Divider */}
          <div className="my-4 h-px bg-line" />

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rail-nav-link ${active ? "active" : ""}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="mt-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={handleLogout}
              className="rail-nav-link w-full text-muted hover:text-danger hover:bg-red-50"
            >
              {icon.logout}
              Logout
            </button>
          </div>
        </aside>

        {/* ─── Right column ────────────────────────────────────────── */}
        <div className="flex flex-col h-full gap-4 min-h-0">

          {/* ─── Header ──────────────────────────────────────────── */}
          <header className="rail-panel p-4 shrink-0 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Link href={homeHref} className="shrink-0 lg:hidden">
                  <Image
                    src="/neurorail-logo.svg"
                    alt="NeuroRail logo"
                    width={40}
                    height={40}
                    className="h-10 w-10"
                  />
                </Link>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    NeuroRail
                  </p>
                  <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{title}</h1>
                  <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
                </div>
              </div>

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="rounded-lg border border-line p-2 text-muted transition hover:text-foreground hover:border-line-strong lg:hidden"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={open ? "Close menu" : "Open menu"}
              >
                {open ? icon.close : icon.menu}
              </button>
            </div>

            {/* Search + mode badge */}
            <div className="mt-3 flex gap-2">
              {onSearchChange ? (
                <input
                  className="rail-input flex-1 text-sm"
                  placeholder={searchPlaceholder ?? "Search this view..."}
                  value={searchValue ?? ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              ) : null}
              <span className="rail-badge bg-accent/10 text-accent border border-accent/20 text-xs font-semibold">
                {role === "admin" ? "Control" : "View"} Mode
              </span>
            </div>

            {/* Mobile nav drawer */}
            {open ? (
              <nav className="mt-3 grid gap-1 rounded-xl border border-line bg-panel p-3 lg:hidden animate-slide-up">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`rail-nav-link ${active ? "active" : ""}`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rail-nav-link text-muted hover:text-danger hover:bg-red-50 mt-1"
                >
                  {icon.logout}
                  Logout
                </button>
              </nav>
            ) : null}
          </header>

          {/* ─── Page content ────────────────────────────────────── */}
          <section className="flex-1 space-y-4 overflow-y-auto min-h-0">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
