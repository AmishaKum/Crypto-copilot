import { useState } from "react";
import { useApi } from "../lib/useApi";
import { money, pct } from "../lib/format";

function Status({ ok, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500 animate-pulseDot" : "bg-rose-500"}`} />
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [cur, setCur] = useState("USD");
  const health = useApi("/health", 30_000);
  const price = useApi("/market/price", 60_000);
  const fees = useApi("/market/fees", 30_000);
  const p = price.data;
  const change = p?.change24h?.[cur.toLowerCase()];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Bitcoin intelligence</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Market pulse</h1>
        </div>
        <div className="flex items-center gap-4">
          <Status ok={health.data?.status === "ok"} label={health.data ? `API · DB ${health.data.db}` : "API offline"} />
          <div role="group" aria-label="Currency" className="flex rounded-full border border-slate-300 p-0.5 text-sm dark:border-navy-600">
            {["USD", "INR"].map((c) => (
              <button key={c} onClick={() => setCur(c)} aria-pressed={cur === c}
                className={`rounded-full px-3 py-1 transition ${cur === c ? "bg-btc text-navy-950 font-semibold" : "text-slate-500"}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card md:col-span-2">
          <p className="label">BTC price</p>
          {price.error && !p ? <p className="mt-3 text-rose-500">Couldn't load price: {price.error}</p> : (
            <>
              <p className="num mt-2 text-4xl font-semibold sm:text-5xl">{p ? money(p[cur.toLowerCase()], cur) : "…"}</p>
              <p className={`num mt-2 text-sm ${change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{pct(change)} <span className="text-slate-500">24h</span></p>
              {p && <p className="mt-4 text-xs text-slate-500">Source: {p.source} · updated {new Date(p.updatedAt).toLocaleTimeString()}</p>}
            </>
          )}
        </section>

        <section className="card">
          <p className="label">Network fees</p>
          {fees.error && !fees.data ? <p className="mt-3 text-rose-500">{fees.error}</p> : (
            <ul className="mt-3 space-y-2">
              {[["Next block", "fastest"], ["~30 min", "halfHour"], ["~1 hour", "hour"], ["Economy", "economy"]].map(([l, k]) => (
                <li key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{l}</span>
                  <span className="num">{fees.data ? `${fees.data[k]} sat/vB` : "…"}</span>
                </li>
              ))}
            </ul>
          )}
          {fees.data && <p className="mt-4 text-xs text-slate-500">Source: {fees.data.source}</p>}
        </section>
      </div>
    </div>
  );
}
