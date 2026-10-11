import { useState } from "react";
import { Bell, BellRing, Info, RefreshCw, Trash2 } from "lucide-react";
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import { money, timeAgo } from "../lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Select, Skeleton } from "../components/ui";

const KINDS = {
  price_above: "BTC price rises to or above",
  price_below: "BTC price falls to or below",
  fee_above: "Next-block fee rises to or above",
  fee_below: "Next-block fee falls to or below",
};
const fmt = (a, value) => (a.kind.startsWith("price") ? money(value, a.currency) : `${value} sat/vB`);

export default function Alerts() {
  const { data, error, loading, reload } = useApi("/alerts", { refreshMs: 60_000 });
  const [form, setForm] = useState({ kind: "price_below", threshold: "", currency: "USD" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const isPrice = form.kind.startsWith("price");

  const act = async (fn) => { setMsg(null); try { await fn(); reload(); } catch (e) { setMsg({ error: e }); } };
  async function create(e) {
    e.preventDefault();
    if (!(Number(form.threshold) > 0)) return setMsg({ error: "Enter a threshold greater than 0." });
    setBusy(true);
    await act(() => api("/alerts", { body: { ...form, threshold: Number(form.threshold) } }));
    setForm((f) => ({ ...f, threshold: "" })); // functional update: keep edits made while saving
    setBusy(false);
  }
  async function checkNow() {
    setBusy(true);
    await act(async () => {
      const r = await api("/alerts/check", { method: "POST" });
      setMsg({ ok: `Checked ${r.evaluated} alert(s). ${r.triggered} newly triggered.` });
    });
    setBusy(false);
  }

  return (
    <div>
      <PageHeader eyebrow="Notifications" title="Smart alerts"
        actions={<Button variant="ghost" size="sm" onClick={checkNow} loading={busy}><RefreshCw size={14} /> Check now</Button>}>
        Get an in-app alert when Bitcoin's price or network fees cross a level you choose.
      </PageHeader>
      <p className="mb-4 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-btc" aria-hidden />
        <span>Alerts are checked every couple of minutes <strong>while the server is running</strong> (free hosting may sleep when idle), plus whenever you press "Check now". Each alert fires once when its condition becomes true, then re-arms after it becomes false. Notifications appear here only; email and push aren't available yet.
          {data?.lastCheckedAt && <> Last automatic check: {timeAgo(data.lastCheckedAt)}.</>}</span>
      </p>
      {msg?.error && <div className="mb-4"><ErrorState error={msg.error} compact /></div>}
      {msg?.ok && <p className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">{msg.ok}</p>}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader icon={Bell} title="New alert" />
          <form onSubmit={create} className="space-y-4">
            <Field label="Condition" id="kind">
              <Select id="kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
            <div className="flex gap-2">
              <div className="flex-1">
                <Field label={isPrice ? "Price" : "Fee rate (sat/vB)"} id="threshold">
                  <Input id="threshold" inputMode="decimal" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="num" />
                </Field>
              </div>
              {isPrice && (
                <div className="w-24"><Field label="Currency" id="cur"><Select id="cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>USD</option><option>INR</option></Select></Field></div>
              )}
            </div>
            <Button type="submit" loading={busy} className="w-full">Create alert</Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your alerts" sub={data ? `${data.alerts.length} of 20` : null} />
            {loading && !data ? <Skeleton className="h-24" /> : error && !data ? <ErrorState error={error} onRetry={reload} compact /> : !data.alerts.length ? (
              <EmptyState icon={Bell} title="No alerts yet">Try "Next-block fee falls to or below 5 sat/vB" to catch a cheap time to move coins.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {data.alerts.map((a) => (
                  <li key={a._id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{KINDS[a.kind]} <span className="num">{fmt(a, a.threshold)}</span></p>
                      <p className="text-xs text-muted">{a.triggerCount ? `Triggered ${a.triggerCount}× · last ${timeAgo(a.lastTriggeredAt)}` : "Not triggered yet"}{a.conditionMet && " · condition currently met"}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={a.enabled} onChange={() => act(() => api(`/alerts/${a._id}`, { method: "PATCH", body: { enabled: !a.enabled } }))} className="h-4 w-4 accent-[#f7931a]" />
                      {a.enabled ? "On" : "Off"}
                    </label>
                    <button onClick={() => act(() => api(`/alerts/${a._id}`, { method: "DELETE" }))} aria-label="Delete alert" className="rounded p-1 text-muted hover:text-rose-500"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader icon={BellRing} title="Triggered history"
              action={data?.unread > 0 && <Button size="sm" variant="subtle" onClick={() => act(() => api("/alerts/events/read", { method: "POST" }))}>Mark all read</Button>} />
            {!data?.events?.length ? <EmptyState title="Nothing triggered yet" /> : (
              <ul className="divide-y divide-line">
                {data.events.map((e) => (
                  <li key={e._id} className="flex items-center gap-3 py-2.5 text-sm">
                    {!e.read && <span className="h-2 w-2 rounded-full bg-btc" aria-label="Unread" />}
                    <span className="flex-1">{KINDS[e.kind]} <span className="num">{fmt(e, e.threshold)}</span>: observed <span className="num font-medium">{fmt(e, e.observedValue)}</span></span>
                    <Badge>{e.source}</Badge>
                    <span className="text-xs text-muted">{timeAgo(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
