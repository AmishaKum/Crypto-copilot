import { Hourglass } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { Card, CardHeader, ErrorState, Skeleton, SourceTag } from "../ui";

const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

export default function NetworkCard() {
  const { data: d, error, loading, reload } = useApi("/market/network", { refreshMs: 120_000 });
  return (
    <Card>
      <CardHeader icon={Hourglass} title="Network & halving" sub="Block height, next halving and waiting transactions" />
      {loading && !d ? <Skeleton className="h-36" /> : error && !d ? <ErrorState error={error} onRetry={reload} compact /> : (
        <>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Next halving in</span>
            <span className="num font-semibold">{fmt(d.blocksLeft)} blocks</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={d.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next halving">
            <div className="h-full rounded-full bg-btc" style={{ width: `${d.progressPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">≈ {new Date(d.estimatedDate).toLocaleDateString([], { month: "long", year: "numeric" })} (estimate at ~10 min per block)</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted">Block height</span><span className="num">#{fmt(d.height)}</span></li>
            <li className="flex justify-between"><span className="text-muted">Block reward</span><span className="num">{d.blockRewardBtc} → {d.nextBlockRewardBtc} BTC</span></li>
            <li className="flex justify-between"><span className="text-muted">Waiting transactions</span><span className="num">{fmt(d.mempool.txCount)}</span></li>
          </ul>
          <SourceTag className="mt-3" source={d.source} at={d.fetchedAt} stale={d.stale} />
        </>
      )}
    </Card>
  );
}
