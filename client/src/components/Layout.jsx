import { NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export const NAV = [
  { to: "/", label: "Dashboard", ready: true },
  { to: "/detective", label: "Tx Detective" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/portfolio", label: "Virtual Portfolio" },
  { to: "/risk", label: "Risk Simulator" },
  { to: "/alerts", label: "Smart Alerts" },
  { to: "/academy", label: "Academy" },
];

export default function Layout() {
  return (
    <div className="min-h-screen grid-glow">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur dark:border-navy-800 dark:bg-navy-950/80">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btc text-navy-950">₿</span>
            Crypto<span className="text-btc">Copilot</span>
          </NavLink>
          <nav className="ml-6 hidden gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm transition ${isActive ? "bg-btc/15 text-btc" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1 text-xs ${isActive ? "bg-btc/15 text-btc" : "text-slate-500 dark:text-slate-400"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500">
        Educational tool. Not financial advice. No real trading, no custody — never share your seed phrase.
      </footer>
    </div>
  );
}
