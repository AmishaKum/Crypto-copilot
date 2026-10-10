import { TrendingDown, TrendingUp } from "lucide-react";
import { compact, money, pct } from "../../lib/format";
import { Badge, Card, ErrorState, Skeleton, SourceTag, Stat } from "../ui";

export default function PriceHero({ snapshot, currency }) {
  const { data, error, loading, reload } = snapshot;
  const m = data?.[currency.toLowerCase()];
  const up = (m?.change24hPct ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="label">Bitcoin · BTC/{currency}</p>
        {data?.stale && <Badge tone="warn">Stale: provider unavailable</Badge>}
      </div>
      {loading && !data ? (
        <div className="mt-3 space-y-3"><Skeleton className="h-12 w-64" /><Skeleton className="h-5 w-40" /></div>
      ) : error && !data ? (
        <div className="mt-3"><ErrorState error={error} onRetry={reload} /></div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p className="num text-4xl font-semibold tracking-tight sm:text-5xl">{money(m.price, currency)}</p>
            <Badge tone={up ? "up" : "down"}>{up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {pct(m.change24hPct)} 24h</Badge>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="24h high" value={money(m.high24h, currency)} />
            <Stat label="24h low" value={money(m.low24h, currency)} />
            <Stat label="Market cap" value={compact(m.marketCap, currency)} />
            <Stat label="24h volume" value={compact(m.volume24h, currency)} />
          </div>
          <SourceTag className="mt-4" source={data.source} at={data.lastUpdated || data.fetchedAt} stale={data.stale} />
        </>
      )}
    </Card>
  );
}
