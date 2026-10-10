import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { useApi } from "../../lib/useApi";
import { compact, money, pct } from "../../lib/format";
import { Card, CardHeader, ErrorState, Segmented, Skeleton, SourceTag } from "../ui";

const RANGES = [[1, "24H"], [7, "7D"], [30, "1M"], [90, "3M"], [365, "1Y"]];

function ChartTooltip({ active, payload, currency, days }) {
  if (!active || !payload?.length) return null;
  const { t, p } = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">{new Date(t).toLocaleString([], days <= 1 ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: days > 90 ? "numeric" : undefined })}</p>
      <p className="num mt-0.5 font-semibold">{money(p, currency)}</p>
    </div>
  );
}

export default function PriceChart({ currency }) {
  const [days, setDays] = useState(7);
  const { data, error, loading, reload } = useApi(`/market/chart?days=${days}&currency=${currency}`, { refreshMs: 120_000 });
  const points = data?.points || [];
  const change = points.length > 1 ? ((points.at(-1).p - points[0].p) / points[0].p) * 100 : null;
  const tickFmt = (t) => new Date(t).toLocaleDateString([], days <= 1 ? { hour: "2-digit" } : { day: "numeric", month: "short" });

  return (
    <Card>
      <CardHeader icon={LineIcon} title="BTC price history"
        sub={change != null ? <>Change over period: <span className={change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{pct(change)}</span></> : null}
        action={<Segmented label="Time range" options={RANGES} value={days} onChange={setDays} />} />
      {loading && !data ? <Skeleton className="h-64" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !points.length ? (
        <p className="py-16 text-center text-sm text-muted">No chart data returned for this range.</p>
      ) : (
        <div className="h-64" role="img" aria-label={`Bitcoin price in ${currency} over the selected range, from ${money(points[0].p, currency)} to ${money(points.at(-1).p, currency)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
              <XAxis dataKey="t" tickFormatter={tickFmt} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} minTickGap={56} />
              <YAxis domain={["auto", "auto"]} tickFormatter={(v) => compact(v, currency)} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={64} />
              <Tooltip content={<ChartTooltip currency={currency} days={days} />} cursor={{ stroke: "rgb(var(--muted))", strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="p" stroke="var(--series-1)" strokeWidth={2} fill="url(#btcFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--surface))" }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {data && <SourceTag className="mt-3" source={data.source} at={data.fetchedAt} stale={data.stale} />}
    </Card>
  );
}
