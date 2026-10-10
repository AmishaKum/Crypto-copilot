import { Gauge } from "lucide-react";
import { Card, CardHeader, ErrorState, Skeleton, SourceTag } from "../ui";

const ROWS = [["Next block", "fastest", "~10 min"], ["Half hour", "halfHour", "~30 min"], ["One hour", "hour", "~60 min"], ["Economy", "economy", "hours+"]];

export default function FeesCard({ fees }) {
  const { data, error, loading, reload } = fees;
  return (
    <Card>
      <CardHeader icon={Gauge} title="Network fees" sub="Recommended rates to get confirmed" />
      {loading && !data ? <Skeleton className="h-36" /> : error && !data ? <ErrorState error={error} onRetry={reload} compact /> : (
        <>
          <ul className="space-y-2.5">
            {ROWS.map(([l, k, eta]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <span><span className="font-medium">{l}</span> <span className="text-xs text-muted">{eta}</span></span>
                <span className="num">{data[k]} <span className="text-xs text-muted">sat/vB</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">A typical 1-input, 2-output transaction is ~141 vB, so at {data.fastest} sat/vB the fee is ≈ {(data.fastest * 141).toLocaleString()} sats.</p>
          <SourceTag className="mt-3" source={data.source} at={data.fetchedAt} stale={data.stale} />
        </>
      )}
    </Card>
  );
}
