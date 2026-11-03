import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Wallet } from "lucide-react";
import { useApi } from "../lib/useApi";
import { useAuth, useCurrency } from "../context/AuthContext";
import { PageHeader, Segmented, Card } from "../components/ui";
import PriceHero from "../components/market/PriceHero";
import PriceChart from "../components/market/PriceChart";
import FeesCard from "../components/market/FeesCard";
import Watchlist from "../components/market/Watchlist";
import NetworkCard from "../components/market/NetworkCard";
import { money } from "../lib/format";

const SHORTCUTS = [
  { to: "/app/explorer", icon: Search, title: "Investigate a transaction", text: "Paste a txid to see fees and confirmations." },
  { to: "/app/assistant", icon: Sparkles, title: "Ask the AI copilot", text: "Explanations backed by live data and sources." },
  { to: "/app/portfolio", icon: Wallet, title: "Practice trading", text: "Buy and sell BTC with virtual money." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [currency, setCurrency] = useCurrency();
  const snapshot = useApi("/market/snapshot", { refreshMs: 60_000 });
  const fees = useApi("/market/fees", { refreshMs: 60_000 });
  const live = snapshot.data?.[currency.toLowerCase()];

  // Live price in the browser tab title while the dashboard is open.
  useEffect(() => {
    if (live?.price) document.title = `₿ ${money(live.price, currency)} ${live.change24hPct >= 0 ? "▲" : "▼"}${Math.abs(live.change24hPct ?? 0).toFixed(1)}% · Crypto Copilot`;
    return () => { document.title = "Crypto Copilot"; };
  }, [live?.price, live?.change24hPct, currency]);

  return (
    <div className="fade-in">
      <PageHeader eyebrow={`Hi ${user.name.split(" ")[0]}`} title="Market pulse"
        actions={<Segmented label="Display currency" options={["USD", "INR"]} value={currency} onChange={setCurrency} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PriceHero snapshot={snapshot} currency={currency} />
          <PriceChart currency={currency} />
        </div>
        <div className="space-y-4">
          <FeesCard fees={fees} />
          <NetworkCard />
          <Watchlist currency={currency} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition group-hover:border-btc/50">
              <Icon size={18} className="text-btc" aria-hidden />
              <p className="mt-2 font-medium">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
