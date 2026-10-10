import { Link, Outlet } from "react-router-dom";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

export default function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-[rgb(var(--bg)/.85)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo />
          <nav aria-label="Main" className="ml-8 hidden gap-6 text-sm text-muted md:flex">
            <a href="/#features" className="hover:text-ink">Features</a>
            <a href="/#security" className="hover:text-ink">Security</a>
            <a href="/#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link to="/app" className="rounded-xl bg-btc px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-btc-soft">Open app</Link>
            ) : (
              <>
                <Link to="/login" className="hidden rounded-xl px-3 py-2 text-sm font-medium hover:text-btc sm:block">Log in</Link>
                <Link to="/register" className="rounded-xl bg-btc px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-btc-soft">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
