import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Sparkles, Wallet, ShieldAlert, Bell, GraduationCap, Settings, BarChart3, LogOut, Menu, X,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../lib/useApi";
import { cx } from "./ui";
import { FullPageLoader } from "./RouteGuards";

export const APP_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/explorer", label: "Tx Detective", icon: Search },
  { to: "/app/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/app/portfolio", label: "Virtual Portfolio", icon: Wallet },
  { to: "/app/risk", label: "Risk Simulator", icon: ShieldAlert },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/academy", label: "Academy", icon: GraduationCap },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function NavItems({ isAdmin, unread }) {
  const items = isAdmin ? [...APP_NAV, { to: "/app/admin", label: "Admin", icon: BarChart3 }] : APP_NAV;
  return items.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end}
      className={({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        isActive ? "bg-btc/10 font-medium text-btc-deep dark:text-btc" : "text-muted hover:bg-slate-500/5 hover:text-ink")}>
      <Icon size={17} aria-hidden /> {label}
      {to === "/app/alerts" && unread > 0 && <span className="ml-auto rounded-full bg-btc px-1.5 text-[10px] font-semibold text-navy-950" aria-label={`${unread} unread alerts`}>{unread > 9 ? "9+" : unread}</span>}
    </NavLink>
  ));
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useApi("/alerts/unread", { refreshMs: 60_000 }).data?.unread ?? 0;
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = async () => { await logout(); navigate("/"); };
  const userBox = (
    <div className="border-t border-line p-3">
      <p className="truncate px-3 text-sm font-medium">{user.name}</p>
      <p className="truncate px-3 text-xs text-muted">{user.email}</p>
      <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-slate-500/5 hover:text-ink">
        <LogOut size={17} aria-hidden /> Log out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center justify-between px-5 py-4"><Logo to="/app" /></div>
        <nav aria-label="App" className="flex-1 space-y-0.5 overflow-y-auto px-3"><NavItems isAdmin={user.role === "admin"} unread={unread} /></nav>
        <div className="flex items-center justify-between px-6 pb-2 text-xs text-muted">Theme <ThemeToggle /></div>
        {userBox}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[rgb(var(--bg)/.9)] px-4 py-3 backdrop-blur lg:hidden">
        <Logo to="/app" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-full border border-line"><Menu size={18} /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-surface fade-in">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo to="/app" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1"><X size={20} /></button>
            </div>
            <nav aria-label="App" className="flex-1 space-y-0.5 overflow-y-auto px-3"><NavItems isAdmin={user.role === "admin"} unread={unread} /></nav>
            {userBox}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <Suspense fallback={<FullPageLoader />}><Outlet /></Suspense>
        <p className="mt-10 text-[11px] text-muted">Educational tool, not financial advice. Simulated money only. Never share your seed phrase.</p>
      </main>
    </div>
  );
}
