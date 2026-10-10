import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Calculator, Plus, ShieldAlert, X } from "lucide-react";
import { api } from "../lib/api";
import { cents, signedCents } from "../lib/format";
import { Badge, Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, cx } from "../components/ui";

const PRESETS = [-50, -30, -20, -10, -5, 5, 10, 20, 50];
const COLORS = ["var(--series-1)", "var(--series-2)"];

function PortfolioInputs({ value, onChange, onRemove, index }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index] }} aria-hidden />
        <Input aria-label="Portfolio name" value={value.label} onChange={set("label")} className="h-9 font-medium" maxLength={40} />
        {onRemove && <button type="button" onClick={onRemove} aria-label="Remove portfolio" className="p-1 text-muted hover:text-rose-500"><X size={16} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="BTC amount" id={`btc${index}`}><Input id={`btc${index}`} inputMode="decimal" value={value.btc} onChange={set("btc")} className="num" /></Field>
        <Field label="Cash (USD)" id={`cash${index}`}><Input id={`cash${index}`} inputMode="decimal" value={value.cashUsd} onChange={set("cashUsd")} className="num" /></Field>
      </div>
    </div>
  );
}

export default function Risk() {
  const [pfs, setPfs] = useState([{ label: "All-in BTC", btc: "0.1", cashUsd: "0" }]);
  const [shocks, setShocks] = useState([-30, -20, -10, 10, 20]);
  const [manualPrice, setManualPrice] = useState("");
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function useMine() {
    try {
      const p = await api("/portfolio");
      const mine = { label: "My virtual portfolio", btc: String(p.btcSats / 1e8), cashUsd: String(p.cashCents / 100) };
      setPfs((cur) => [mine, ...cur.slice(1)]);
    } catch (e) { setError(e); }
  }
  const toggle = (s) => setShocks((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s].sort((a, b) => a - b)));
  const addCustom = () => {
    const n = Number(custom);
    if (Number.isFinite(n) && n >= -99 && n <= 500 && n !== 0 && !shocks.includes(n) && shocks.length < 12) toggle(n);
    setCustom("");
  };

  async function run(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = { shocks, portfolios: pfs.map((p) => ({ label: p.label, btc: Number(p.btc) || 0, cashUsd: Number(p.cashUsd) || 0 })) };
      if (manualPrice) body.priceUsd = Number(manualPrice);
      setResult(await api("/risk/simulate", { body }));
    } catch (x) { setError(x); } finally { setBusy(false); }
  }

  const chartData = result ? shocks.filter((s) => result.results[0].scenarios.some((x) => x.shockPct === s)).map((s) => ({
    shock: `${s > 0 ? "+" : ""}${s}%`,
    ...Object.fromEntries(result.results.map((r) => [r.label, (r.scenarios.find((x) => x.shockPct === s)?.changeCents ?? 0) / 100])),
  })) : [];

  return (
    <div>
      <PageHeader eyebrow="What-if analysis" title="Risk simulator" actions={<Badge tone="warn">Hypothetical, not a forecast</Badge>}>
        Explore how sudden BTC price moves would change a portfolio's value. Compare an all-in position with a more balanced one.
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader icon={Calculator} title="Scenario setup" />
          <form onSubmit={run} className="space-y-4">
            {pfs.map((p, i) => (
              <PortfolioInputs key={i} index={i} value={p} onChange={(v) => setPfs(pfs.map((x, j) => (j === i ? v : x)))} onRemove={i > 0 ? () => setPfs(pfs.slice(0, 1)) : null} />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={useMine}>Use my virtual portfolio</Button>
              {pfs.length < 2 && <Button type="button" variant="ghost" size="sm" onClick={() => setPfs([...pfs, { label: "Balanced 50/50", btc: "0.05", cashUsd: "3000" }])}><Plus size={14} /> Compare</Button>}
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Price moves</legend>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...PRESETS, ...shocks])].sort((a, b) => a - b).map((s) => (
                  <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={shocks.includes(s)}
                    className={cx("num rounded-lg border px-2.5 py-1 text-xs transition", shocks.includes(s) ? (s < 0 ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400") : "border-line text-muted")}>
                    {s > 0 ? "+" : ""}{s}%
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input aria-label="Custom percent move" placeholder="Custom %, e.g. -40" value={custom} onChange={(e) => setCustom(e.target.value)} className="h-9" />
                <Button type="button" variant="ghost" size="sm" onClick={addCustom}>Add</Button>
              </div>
            </fieldset>
            <Field label="BTC price (USD)" id="price" hint="Leave empty to use the live price."><Input id="price" inputMode="decimal" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="Live" className="num" /></Field>
            {error && <ErrorState error={error} compact />}
            <Button type="submit" loading={busy} disabled={!shocks.length} className="w-full">Run simulation</Button>
          </form>
        </Card>

        <div className="space-y-4">
          {!result ? (
            <Card className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <ShieldAlert size={28} className="text-btc" aria-hidden />
              <p className="mt-3 font-medium">Set up a scenario and run it</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Bitcoin has fallen more than 50% several times in its history. Seeing the numbers in advance helps you size positions you can live with.</p>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Change in portfolio value" sub={`Starting BTC price ${cents(result.priceCents)} · ${result.priceSource}`} />
                <div className="h-64" role="img" aria-label="Bar chart of portfolio value change for each price scenario">
                  <ResponsiveContainer>
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
                      <XAxis dataKey="shock" tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} tick={{ fontSize: 11, fill: "rgb(var(--muted))" }} axisLine={false} tickLine={false} width={72} />
                      <ReferenceLine y={0} stroke="rgb(var(--muted))" />
                      <Tooltip formatter={(v, n) => [signedCents(Math.round(v * 100)), n]} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgb(var(--line) / .4)" }} />
                      {result.results.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "rgb(var(--muted))" }}>{v}</span>} />}
                      {result.results.map((r, i) => <Bar key={r.label} dataKey={r.label} fill={COLORS[i]} radius={[4, 4, 4, 4]} maxBarSize={28} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              {result.results.map((r, i) => (
                <Card key={r.label}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} aria-hidden />
                    <h3 className="font-semibold">{r.label}</h3>
                    <span className="text-xs text-muted">Value now {cents(r.equityCents)}</span>
                    <Badge tone={r.btcSharePct > 80 ? "warn" : "neutral"} className="ml-auto">{r.btcSharePct}% in BTC{r.btcSharePct > 80 ? ": highly concentrated" : ""}</Badge>
                  </div>
                  <div className="-mx-5 overflow-x-auto px-5">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead><tr className="text-left text-xs text-muted"><th className="py-1.5 font-medium">BTC move</th><th className="text-right font-medium">BTC price</th><th className="text-right font-medium">Portfolio value</th><th className="text-right font-medium">Change</th></tr></thead>
                      <tbody className="divide-y divide-line">
                        {r.scenarios.map((s) => (
                          <tr key={s.shockPct}>
                            <td className="num py-1.5">{s.shockPct > 0 ? "+" : ""}{s.shockPct}%</td>
                            <td className="num text-right">{cents(s.priceCents)}</td>
                            <td className="num text-right">{cents(s.equityCents)}</td>
                            <td className={cx("num text-right", s.changeCents < 0 ? "text-rose-600 dark:text-rose-400" : s.changeCents > 0 ? "text-emerald-600 dark:text-emerald-400" : "")}>{signedCents(s.changeCents)} ({s.changePct}%)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
              <Card>
                <p className="label">How it's calculated</p>
                <p className="mt-2 text-sm text-muted">New value = cash + BTC amount × (price × (1 + move%)). Change % is relative to today's value.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
