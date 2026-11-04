import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, ExternalLink, History, PieChart as PieIcon, RotateCcw, Wallet } from "lucide-react";
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import { cents, signedCents, money, pct } from "../lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Segmented, Select, Skeleton, SourceTag, Stat, toneOf, cx } from "../components/ui";
import BuyRealDialog from "../components/BuyRealDialog";

const COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];
const OTHER_COLOR = "var(--cat-6)";
const usdPrice = (usd) => (usd == null ? "—" : money(usd, "USD", { decimals: usd < 1 ? 4 : 2 }));
const fmtAmount = (a, sym) => `${Number(a).toLocaleString("en-US", { maximumFractionDigits: 8 })} ${sym}`;

function TradeForm({ coins, prices, p, coin, setCoin, onDone, onBuyReal }) {
  const [side, setSide] = useState("buy");
  const [unit, setUnit] = useState("usd");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const meta = coins.find((c) => c.id === coin) || { symbol: "BTC", name: "Bitcoin", id: "bitcoin" };
  const price = prices?.[coin]?.usd ?? null;
  const held = p.holdings.find((h) => h.coin === coin);
  const v = Number(amount);
  const estCoin = unit === "coin" ? v : price ? v / price : 0;
  const estUsd = unit === "usd" ? v : price ? v * price : 0;
  const fee = (estUsd * p.feeBps) / 10_000;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!(v > 0)) return setMsg({ error: "Enter an amount greater than 0." });
    setBusy(true);
    try {
      const r = await api("/portfolio/trades", { body: { coin, side, [unit === "usd" ? "usd" : "amount"]: v } });
      setMsg({ ok: `Simulated ${side} of ${fmtAmount(r.trade.sats / 1e8, meta.symbol)} at ${usdPrice(r.trade.priceMicros / 1e6)} filled.` });
      setAmount("");
      onDone();
    } catch (err) { setMsg({ error: err }); } finally { setBusy(false); }
  }

  const max = () => {
    if (!price) return;
    const factor = 1 + p.feeBps / 10_000;
    if (side === "sell") setAmount(unit === "coin" ? String(held?.amount || 0) : String(Math.floor((held?.amount || 0) * price * 100) / 100));
    else setAmount(unit === "usd" ? String(Math.floor(p.cashCents / factor) / 100) : String(Math.floor((p.cashCents / 100 / factor / price) * 1e8) / 1e8));
  };

  return (
    <Card>
      <CardHeader icon={Wallet} title="Simulated trade" sub={price ? `Fills at the live price: ${usdPrice(price)}` : "Live price unavailable: trading paused"} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Coin" id="coin">
          <Select id="coin" value={coin} onChange={(e) => { setCoin(e.target.value); setMsg(null); }}>
            {coins.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol}){prices?.[c.id] ? ` · ${usdPrice(prices[c.id].usd)}` : ""}</option>)}
          </Select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Segmented label="Side" options={[["buy", "Buy"], ["sell", "Sell"]]} value={side} onChange={setSide} />
          <Segmented label="Amount unit" options={[["usd", "USD"], ["coin", meta.symbol]]} value={unit} onChange={setUnit} />
        </div>
        <Field label={`Amount (${unit === "usd" ? "USD" : meta.symbol})`} id="amt" hint={held ? `You hold ${fmtAmount(held.amount, meta.symbol)}` : side === "sell" ? `You don't hold any ${meta.symbol} yet` : null}>
          <div className="flex gap-2">
            <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={unit === "usd" ? "500" : "0.5"} className="num" />
            <Button type="button" variant="ghost" onClick={max} disabled={!price}>Max</Button>
          </div>
        </Field>
        {v > 0 && price && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
            ≈ {estCoin.toFixed(8)} {meta.symbol} for {money(estUsd, "USD", { decimals: 2 })} · simulated fee ({p.feeBps / 100}%) ≈ {money(fee, "USD", { decimals: 2 })}.
            Final amounts are calculated on the server at execution.
          </p>
        )}
        {msg?.error && <ErrorState error={msg.error} compact />}
        {msg?.ok && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">{msg.ok}</p>}
        <Button type="submit" loading={busy} disabled={!price} className="w-full">{side === "buy" ? `Simulate buy ${meta.symbol}` : `Simulate sell ${meta.symbol}`}</Button>
        <button type="button" onClick={() => onBuyReal(meta)} className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted hover:text-btc">
          <ExternalLink size={13} aria-hidden /> Buy {meta.symbol} for real on an exchange
        </button>
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
        <p className="text-sm font-medium">Reset deletes all simulated trades and holdings and restores virtual cash.</p>
        <Field label="Starting balance (USD, 100 – 1,000,000)" id="start"><Input id="start" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label='Type "RESET" to confirm' id="confirm"><Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></Field>
        {err && <ErrorState error={err} compact />}
        <div className="flex gap-2"><Button variant="danger" loading={busy} disabled={confirm !== "RESET"}>Reset</Button><Button type="button" variant="subtle" onClick={() => setOpen(false)}>Cancel</Button></div>
      </form>
    </Card>
  );
}

function Allocation({ p }) {
  // Top 5 coins get their own colour; the rest fold into "Other" so colours never repeat.
  const slices = useMemo(() => {
    const coinsSorted = p.holdings.filter((h) => h.valueCents > 0);
    const top = coinsSorted.slice(0, 5).map((h, i) => ({ name: h.symbol, value: h.valueCents, color: COLORS[i] }));
    const rest = coinsSorted.slice(5).reduce((s, h) => s + h.valueCents, 0);
    if (rest > 0) top.push({ name: "Other", value: rest, color: OTHER_COLOR });
    if (p.cashCents > 0) top.push({ name: "Cash", value: p.cashCents, color: "var(--cat-cash)" });
    return top;
  }, [p]);
  if (!p.equityCents) return null;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-40 w-40 shrink-0" role="img" aria-label={`Allocation: ${slices.map((s) => `${s.name} ${((s.value / p.equityCents) * 100).toFixed(1)}%`).join(", ")}`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="95%" paddingAngle={1} stroke="rgb(var(--surface))" strokeWidth={2} isAnimationActive={false}>
              {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${cents(v)} (${((v / p.equityCents) * 100).toFixed(1)}%)`, n]} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="font-medium">{s.name}</span>
            <span className="num ml-auto text-muted">{((s.value / p.equityCents) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Portfolio() {
  const p = useApi("/portfolio", { refreshMs: 60_000 });
  const h = useApi("/portfolio/trades");
  const coinsRes = useApi("/market/coins");
  const coins = coinsRes.data?.coins || [];
  const prices = useApi(coins.length ? `/market/watch?ids=${coins.map((c) => c.id).join(",")}` : null, { refreshMs: 60_000 });
  const priceMap = useMemo(() => Object.fromEntries((prices.data?.items || []).map((i) => [i.id, i])), [prices.data]);
  const [coin, setCoin] = useState("bitcoin");
  const [buyReal, setBuyReal] = useState(null);
  const refresh = () => { p.reload(); h.reload(); prices.reload(); };
  const d = p.data;
  const symbolOf = (id) => coins.find((c) => c.id === (id || "bitcoin"))?.symbol || "BTC";

  return (
    <div>
      <PageHeader eyebrow="Paper trading" title="Virtual portfolio" actions={<Badge tone="warn">Simulated money. No real trades.</Badge>}>
        Practice buying and selling 10 cryptocurrencies at live prices. Balances are calculated on the server using the average-cost method.
      </PageHeader>
      {p.loading && !d ? <Skeleton className="h-40" /> : p.error && !d ? <ErrorState error={p.error} onRetry={p.reload} /> : (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Stat label="Total value" value={cents(d.equityCents)} sub={`Started with ${cents(d.startingCashCents)}`} />
              <Stat label="Total P&L" value={signedCents(d.totalPnlCents)} tone={toneOf(d.totalPnlCents)} sub={d.totalPnlCents != null ? `${((d.totalPnlCents / d.startingCashCents) * 100).toFixed(2)}%` : "Needs live prices"} />
              <Stat label="Virtual cash" value={cents(d.cashCents)} sub={d.cashPct != null ? `${d.cashPct}% of portfolio` : null} />
              <Stat label="Coins value" value={cents(d.holdingsValueCents)} sub={`${d.holdings.length} coin${d.holdings.length === 1 ? "" : "s"} held`} />
              <Stat label="Unrealized P&L" value={signedCents(d.unrealizedPnlCents)} tone={toneOf(d.unrealizedPnlCents)} />
              <Stat label="Realized P&L" value={signedCents(d.realizedPnlCents)} tone={toneOf(d.realizedPnlCents)} />
              <Stat label="Simulated fees paid" value={cents(d.feesPaidCents)} />
              <Stat label="Trades" value={d.tradeCount.toLocaleString()} />
            </div>
            <SourceTag className="mt-4" source={d.priceSource} at={d.priceAsOf} stale={d.priceStale} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <TradeForm coins={coins.length ? coins : [{ id: "bitcoin", name: "Bitcoin", symbol: "BTC" }]} prices={priceMap} p={d} coin={coin} setCoin={setCoin} onDone={refresh} onBuyReal={setBuyReal} />
              <ResetCard onDone={refresh} />
            </div>
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader icon={PieIcon} title="Holdings" sub="Your simulated coins, valued at live prices" />
                {!d.holdings.length ? <EmptyState title="No coins yet">Pick a coin on the left and make a simulated buy.</EmptyState> : (
                  <>
                    <Allocation p={d} />
                    <div className="relative -mx-5 mt-4 overflow-x-auto px-5">
                      <table className="w-full min-w-[720px] text-sm [&_td+td]:pl-4 [&_th+th]:pl-4">
                        <thead><tr className="text-left text-xs text-muted">
                          <th className="py-2 font-medium">Coin</th><th className="text-right font-medium">Amount</th><th className="text-right font-medium">Price</th>
                          <th className="text-right font-medium">Value</th><th className="text-right font-medium">Avg cost</th><th className="text-right font-medium">Unrealized</th><th className="relative font-medium"><span className="sr-only">Actions</span></th>
                        </tr></thead>
                        <tbody className="divide-y divide-line">
                          {d.holdings.map((x) => (
                            <tr key={x.coin}>
                              <td className="py-2.5"><span className="font-medium">{x.symbol}</span> <span className="text-xs text-muted">{x.name}</span>
                                {x.change24hPct != null && <span className={cx("num ml-1 text-xs", x.change24hPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{pct(x.change24hPct, 1)}</span>}</td>
                              <td className="num text-right">{x.amount.toLocaleString("en-US", { maximumFractionDigits: 8 })}</td>
                              <td className="num text-right">{x.priceMicros ? usdPrice(x.priceMicros / 1e6) : "—"}</td>
                              <td className="num text-right">{cents(x.valueCents)}<span className="block text-[11px] text-muted">{x.allocationPct != null ? `${x.allocationPct}%` : ""}</span></td>
                              <td className="num text-right">{usdPrice(x.avgCostMicros / 1e6)}</td>
                              <td className={cx("num text-right", x.unrealizedPnlCents > 0 && "text-emerald-600 dark:text-emerald-400", x.unrealizedPnlCents < 0 && "text-rose-600 dark:text-rose-400")}>{signedCents(x.unrealizedPnlCents)}</td>
                              <td className="whitespace-nowrap pl-3 text-right">
                                <button onClick={() => { setCoin(x.coin); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs font-medium text-btc hover:underline">Trade</button>
                                <button onClick={() => setBuyReal(coins.find((c) => c.id === x.coin) || x)} className="ml-3 inline-flex items-center gap-0.5 text-xs text-muted hover:text-btc" aria-label={`Buy ${x.symbol} for real`}>Real <ExternalLink size={11} aria-hidden /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>

              <Card>
                <CardHeader title="Portfolio value after each trade" sub="Valued at the prices when each trade was made" />
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
                <CardHeader icon={History} title="Trade history"
                  action={h.data?.trades?.length > 0 && (
                    <a href={`${import.meta.env.VITE_API_URL || ""}/api/portfolio/trades.csv`} className="inline-flex items-center gap-1 text-xs font-medium text-btc hover:underline" download>
                      <Download size={13} aria-hidden /> Download CSV
                    </a>
                  )} />
                {h.error ? <ErrorState error={h.error} onRetry={h.reload} compact /> : !h.data?.trades?.length ? <EmptyState title="No trades yet">Your simulated buys and sells will appear here.</EmptyState> : (
                  <div className="-mx-5 overflow-x-auto px-5">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-medium">Date</th><th className="font-medium">Side</th><th className="font-medium">Coin</th><th className="text-right font-medium">Amount</th><th className="text-right font-medium">Price</th><th className="text-right font-medium">Fee</th><th className="text-right font-medium">Realized</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {h.data.trades.map((t) => (
                          <tr key={t._id}>
                            <td className="py-2 text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</td>
                            <td><Badge tone={t.side === "buy" ? "up" : "down"}>{t.side}</Badge></td>
                            <td className="font-medium">{symbolOf(t.coin)}</td>
                            <td className="num text-right">{(t.sats / 1e8).toLocaleString("en-US", { maximumFractionDigits: 8 })}</td>
                            <td className="num text-right">{usdPrice(t.priceMicros != null ? t.priceMicros / 1e6 : t.priceCents / 100)}</td>
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
      {buyReal && <BuyRealDialog coin={buyReal} onClose={() => setBuyReal(null)} />}
    </div>
  );
}
