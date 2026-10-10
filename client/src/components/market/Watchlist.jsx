import { useState } from "react";
import { Plus, Star, X } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { api } from "../../lib/api";
import { money, pct } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, EmptyState, ErrorState, Select, Skeleton, SourceTag } from "../ui";

export default function Watchlist({ currency }) {
  const { user, setUser } = useAuth();
  const ids = user.watchlist.join(",");
  const prices = useApi(ids ? `/market/watch?ids=${ids}` : null, { refreshMs: 60_000 });
  const coins = useApi("/market/coins");
  const [err, setErr] = useState(null);
  const available = (coins.data?.coins || []).filter((c) => !user.watchlist.includes(c.id));

  async function change(id, add) {
    setErr(null);
    try {
      const { watchlist } = await api(`/me/watchlist/${id}`, { method: add ? "POST" : "DELETE" });
      setUser({ ...user, watchlist });
    } catch (e) { setErr(e); }
  }

  return (
    <Card>
      <CardHeader icon={Star} title="Watchlist" sub="Bitcoin first. Other coins for comparison only." />
      {err && <ErrorState error={err} compact />}
      {!user.watchlist.length ? <EmptyState title="Your watchlist is empty">Add a coin below to track it.</EmptyState>
        : prices.loading && !prices.data ? <Skeleton className="h-24" />
        : prices.error && !prices.data ? <ErrorState error={prices.error} onRetry={prices.reload} compact /> : (
        <ul className="divide-y divide-line">
          {prices.data.items.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="ml-auto num">{money(c[currency.toLowerCase()], currency)}</span>
              <span className={`num w-16 text-right text-xs ${c.change24hPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{pct(c.change24hPct)}</span>
              <button onClick={() => change(c.id, false)} aria-label={`Remove ${c.name}`} className="rounded p-1 text-muted hover:text-rose-500"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <label className="mt-3 flex items-center gap-2">
          <Plus size={14} className="text-muted" aria-hidden />
          <span className="sr-only">Add coin to watchlist</span>
          <Select className="h-9" value="" onChange={(e) => e.target.value && change(e.target.value, true)}>
            <option value="">Add a coin…</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </label>
      )}
      {prices.data && <SourceTag className="mt-3" source={prices.data.source} at={prices.data.fetchedAt} stale={prices.data.stale} />}
    </Card>
  );
}
