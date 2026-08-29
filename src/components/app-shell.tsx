"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, cx, ToastProvider } from "./ui";

export type ShellUser = { id: number; name: string; email: string; isPlatformAdmin: boolean };
export type ShellBusiness = { id: number; name: string; slug: string; role: string };

type NavItem = { href: string; label: string; icon: string; badge?: number };

const ICONS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  customers: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H2v-2a4 4 0 0 1 3-3.87m4-1.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-4a3 3 0 1 0 0-6",
  products: "M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  quotations: "M9 12h6m-6 4h4M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5",
  invoices: "M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 6h6M9 12h6M9 16h3",
  payments: "M2 8h20M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M6 16h4",
  expenses: "M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  bookings: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  reports: "M3 3v18h18M7 15l3-4 3 3 5-7",
  documents: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Zm0 0v7h7",
  notifications: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 2h-4l-.4 2.6c-.7.3-1.4.7-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  subscription: "M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  admin: "M12 2 4 6v6c0 5 3.4 9.3 8 10 4.6-.7 8-5 8-10V6l-8-4Z",
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] ?? ICONS.dashboard} />
    </svg>
  );
}

type SearchResult = { type: string; id: number; title: string; subtitle: string; href: string };

export default function AppShell({
  user,
  businesses,
  activeBusiness,
  role,
  unreadCount,
  children,
}: {
  user: ShellUser;
  businesses: ShellBusiness[];
  activeBusiness: ShellBusiness | null;
  role: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("bf-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await apiRequest<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data.results);
        setSearchOpen(true);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/app", label: "Dashboard", icon: "dashboard" },
      { href: "/app/customers", label: "Customers", icon: "customers" },
      { href: "/app/products", label: "Products & Services", icon: "products" },
      { href: "/app/quotations", label: "Quotations", icon: "quotations" },
      { href: "/app/invoices", label: "Invoices", icon: "invoices" },
      { href: "/app/payments", label: "Payments", icon: "payments" },
      { href: "/app/expenses", label: "Expenses", icon: "expenses" },
      { href: "/app/tasks", label: "Tasks", icon: "tasks" },
      { href: "/app/calendar", label: "Calendar", icon: "calendar" },
      { href: "/app/bookings", label: "Bookings", icon: "bookings" },
      { href: "/app/team", label: "Team", icon: "team" },
      { href: "/app/reports", label: "Reports", icon: "reports" },
      { href: "/app/documents", label: "Documents", icon: "documents" },
      { href: "/app/notifications", label: "Notifications", icon: "notifications", badge: unreadCount },
      { href: "/app/settings", label: "Settings", icon: "settings" },
      { href: "/app/subscription", label: "Subscription", icon: "subscription" },
    ],
    [unreadCount],
  );

  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem("bf-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  async function switchBiz(id: number) {
    await apiRequest("/api/businesses/switch", { method: "POST", body: JSON.stringify({ businessId: id }) });
    router.refresh();
    router.push("/app");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className={cx("flex h-full flex-col bg-slate-900 text-slate-300 transition-all", collapsed ? "w-[68px]" : "w-64")}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-black text-white">B</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">BizFlow MY</p>
            <p className="truncate text-[10px] text-slate-400">{activeBusiness?.name ?? "No workspace"}</p>
          </div>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {nav.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cx(
                "group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand-600 text-white shadow-sm" : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon name={item.icon} className="shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && !!item.badge && item.badge > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
              )}
            </Link>
          );
        })}
        {user.isPlatformAdmin && (
          <Link
            href="/admin"
            className={cx(
              "mt-2 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20",
            )}
            title={collapsed ? "SaaS Admin" : undefined}
          >
            <Icon name="admin" className="shrink-0" />
            {!collapsed && <span>SaaS Admin</span>}
          </Link>
        )}
      </nav>

      <button
        onClick={toggleCollapse}
        className="hidden shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3 text-xs font-medium text-slate-400 transition hover:text-white lg:flex"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={collapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
        </svg>
        {!collapsed && "Collapse"}
      </button>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebar}</aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 h-full">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-5">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>

            <div ref={searchRef} className="relative min-w-0 flex-1 max-w-lg">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length && setSearchOpen(true)}
                placeholder="Search customers, invoices, tasks…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {searchOpen && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {results.map((r) => (
                    <Link key={`${r.type}-${r.id}`} href={r.href} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{r.type}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">{r.title}</span>
                        <span className="block truncate text-xs text-slate-400">{r.subtitle}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Link href="/app/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
                <Icon name="notifications" />
                {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}
              </Link>

              <div className="relative">
                <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[130px] truncate text-xs font-semibold text-slate-800">{user.name}</span>
                    <span className="block text-[10px] capitalize text-slate-400">{role}</span>
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    {businesses.length > 0 && (
                      <div className="border-t border-slate-100 py-1.5">
                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Workspaces</p>
                        {businesses.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => switchBiz(b.id)}
                            className={cx(
                              "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                              activeBusiness?.id === b.id ? "font-semibold text-brand-700" : "text-slate-600",
                            )}
                          >
                            <span className="truncate">{b.name}</span>
                            <span className="ml-auto text-[10px] capitalize text-slate-400">{b.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-1.5">
                      <Link href="/onboarding" className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                        Setup checklist
                      </Link>
                      <Link href="/app/settings" className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                        Settings
                      </Link>
                      <Link href="/help" className="block rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                        Help Center
                      </Link>
                      <button onClick={logout} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
