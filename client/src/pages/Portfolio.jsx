import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { History, RotateCcw, Wallet } from "lucide-react";
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import { btc, cents, signedCents, money } from "../lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Segmented, Skeleton, SourceTag, Stat, toneOf } from "../components/ui";

function TradeForm({ p, onDone }) {
  const [side, setSide] = useState("buy");
  const [unit, setUnit] = useState("usd");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const price = p.priceCents ? p.priceCents / 100 : null;
  const v = Number(amount);
  const estBtc = unit === "btc" ? v : price ? v / price : 0;
  const estUsd = unit === "usd" ? v : price ? v * price : 0;
  const fee = (estUsd * p.feeBps) / 10_000;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!(v > 0)) return setMsg({ error: "Enter an amount greater than 0." });
    setBusy(true);
    try {
      const r = await api("/portfolio/trades", { body: { side, [unit]: v } });
      setMsg({ ok: `Simulated ${side} of ${btc(r.trade.sats)} at ${cents(r.trade.priceCents)} filled.` });
      setAmount("");
      onDone();
    } catch (err) { setMsg({ error: err }); } finally { setBusy(false); }
  }

  const max = () => setAmount(side === "sell"
    ? unit === "btc" ? String(p.btcSats / 1e8) : String(Math.floor((p.btcSats / 1e8) * price * 100) / 100)
    : unit === "usd" ? String(Math.floor(p.cashCents / (1 + p.feeBps / 10_000)) / 100) : String(Math.floor((p.cashCents / 100 / (1 + p.feeBps / 10_000) / price) * 1e8) / 1e8));

  return (
    <Card>
      <CardHeader icon={Wallet} title="Simulated trade" sub={price ? `Fills at the live price: ${money(price, "USD", { decimals: 2 })}` : "Live price unavailable: trading paused"} />
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Segmented label="Side" options={[["buy", "Buy"], ["sell", "Sell"]]} value={side} onChange={setSide} />
          <Segmented label="Amount unit" options={[["usd", "USD"], ["btc", "BTC"]]} value={unit} onChange={setUnit} />
        </div>
        <Field label={`Amount (${unit.toUpperCase()})`} id="amt">
          <div className="flex gap-2">
            <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={unit === "usd" ? "500" : "0.01"} className="num" />
            <Button type="button" variant="ghost" onClick={max} disabled={!price}>Max</Button>
          </div>
        </Field>
        {v > 0 && price && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            ≈ {estBtc.toFixed(8)} BTC for {money(estUsd, "USD", { decimals: 2 })} · simulated fee ({p.feeBps / 100}%) ≈ {money(fee, "USD", { decimals: 2 })}.
            Final amounts are calculated on the server at execution.
          </p>
        )}
        {msg?.error && <ErrorState error={msg.error} compact />}
        {msg?.ok && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">{msg.ok}</p>}
        <Button type="submit" loading={busy} disabled={!price} className="w-full">{side === "buy" ? "Simulate buy" : "Simulate sell"}</Button>
      </form>
    </Card>
  );
}

function ResetCard({ onDone }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [start, setStart] = useState("10000");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function reset(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await api("/portfolio/reset", { body: { confirm, startingUsd: Number(start) } }); setOpen(false); setConfirm(""); onDone(); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  }
  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><RotateCcw size={14} /> Reset portfolio</Button>;
  return (
    <Card className="border-rose-500/30">
      <form onSubmit={reset} className="space-y-3">
        <p className="text-sm font-medium">Reset deletes all simulated trades and restores virtual cash.</p>
        <Field label="Starting balance (USD, 100 – 1,000,000)" id="start"><Input id="start" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label='Type "RESET" to confirm' id="confirm"><Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></Field>
        {err && <ErrorState error={err} compact />}
        <div className="flex gap-2"><Button variant="danger" loading={busy} disabled={confirm !== "RESET"}>Reset</Button><Button type="button" variant="subtle" onClick={() => setOpen(false)}>Cancel</Button></div>
      </form>
    </Card>
  );
}

export default function Portfolio() {
  const p = useApi("/portfolio", { refreshMs: 60_000 });
  const h = useApi("/portfolio/trades");
  const refresh = () => { p.reload(); h.reload(); };
  const d = p.data;

  return (
    <div>
      <PageHeader eyebrow="Paper trading" title="Virtual portfolio" actions={<Badge tone="warn">Simulated money. No real trades.</Badge>}>
        Practice with live prices. Balances are calculated on the server using the average-cost method, in whole cents and satoshis.
      </PageHeader>
      {p.loading && !d ? <Skeleton className="h-40" /> : p.error && !d ? <ErrorState error={p.error} onRetry={p.reload} /> : (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Stat label="Total value" value={cents(d.equityCents)} sub={`Started with ${cents(d.startingCashCents)}`} />
              <Stat label="Total P&L" value={signedCents(d.totalPnlCents)} tone={toneOf(d.totalPnlCents)} sub={d.totalPnlCents != null ? `${((d.totalPnlCents / d.startingCashCents) * 100).toFixed(2)}%` : "Needs live price"} />
              <Stat label="Virtual cash" value={cents(d.cashCents)} />
              <Stat label="BTC held" value={btc(d.btcSats)} sub={d.btcValueCents != null ? `≈ ${cents(d.btcValueCents)}` : null} />
              <Stat label="Avg. cost / BTC" value={d.avgCostCentsPerBtc ? cents(d.avgCostCentsPerBtc) : "—"} />
              <Stat label="Unrealized P&L" value={signedCents(d.unrealizedPnlCents)} tone={toneOf(d.unrealizedPnlCents)} />
              <Stat label="Realized P&L" value={signedCents(d.realizedPnlCents)} tone={toneOf(d.realizedPnlCents)} />
              <Stat label="Simulated fees paid" value={cents(d.feesPaidCents)} sub={`${d.tradeCount} trades`} />
            </div>
            <SourceTag className="mt-4" source={d.priceSource} at={d.priceAsOf} stale={d.priceStale} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <TradeForm p={d} onDone={refresh} />
              <ResetCard onDone={refresh} />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader title="Portfolio value after each trade" sub="Valued at each trade's execution price" />
                {h.data?.curve?.length > 1 ? (
                  <div className="h-48" role="img" aria-label="Portfolio value after each simulated trade">
                    <ResponsiveContainer>
                      <AreaChart data={h.data.curve.map((c) => ({ t: c.t, v: c.equityCents / 100 }))}>
                        <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
                        <XAxis dataKey="t" tickFormatter={(t) => { const c = h.data.curve; const short = new Date(c.at(-1).t) - new Date(c[0].t) < 2 * 864e5; return new Date(t)[short ? "toLocaleTimeString" : "toLocaleDateString"]([], short ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }); }} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} minTickGap={40} />
                        <YAxis domain={["auto", "auto"]} tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip formatter={(v) => [money(v, "USD", { decimals: 2 }), "Value"]} labelFormatter={(t) => new Date(t).toLocaleString()} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12 }} />
                        <Area type="stepAfter" dataKey="v" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.1} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState title="No history yet">Make a simulated trade to start tracking performance.</EmptyState>}
              </Card>
              <Card>
                <CardHeader icon={History} title="Trade history" />
                {h.error ? <ErrorState error={h.error} onRetry={h.reload} compact /> : !h.data?.trades?.length ? <EmptyState title="No trades yet">Your simulated buys and sells will appear here.</EmptyState> : (
                  <div className="-mx-5 overflow-x-auto px-5">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-medium">Date</th><th className="font-medium">Side</th><th className="text-right font-medium">Amount</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Fee</th><th className="text-right font-medium">Realized</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {h.data.trades.map((t) => (
                          <tr key={t._id}>
                            <td className="py-2 text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</td>
                            <td><Badge tone={t.side === "buy" ? "up" : "down"}>{t.side}</Badge></td>
                            <td className="num text-right">{btc(t.sats)}</td>
                            <td className="num text-right">{cents(t.priceCents)}</td>
                            <td className="num text-right">{cents(t.feeCents)}</td>
                            <td className="num text-right">{t.side === "sell" ? signedCents(t.realizedPnlCents) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
