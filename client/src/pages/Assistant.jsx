import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, ChevronDown, Send, ShieldAlert, Sparkles, User, X } from "lucide-react";
import { useApi } from "../lib/useApi";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton, cx } from "../components/ui";

const SUGGESTIONS = [
  "What does today's BTC price data show?",
  "Are network fees high or low right now?",
  "Explain confirmations like I'm new to Bitcoin",
  "How do 'double your Bitcoin' giveaway scams work?",
];
const QUALITY = { high: ["up", "All live data sources available"], medium: ["warn", "Some data missing or stale"], low: ["down", "No live data available"] };

// Minimal, safe markdown: **bold** and line breaks only. React escapes everything else.
function Rich({ text }) {
  return text.split("\n").map((line, i) => (
    <p key={i} className={line.trim() ? "" : "h-2"}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") && part.endsWith("**") ? <strong key={j} className="text-ink">{part.slice(2, -2)}</strong> : part))}
    </p>
  ));
}

function Evidence({ m }) {
  const [open, setOpen] = useState(false);
  const [tone, label] = QUALITY[m.dataQuality];
  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>Data quality: {m.dataQuality}</Badge>
        <span className="text-muted">{label}</span>
        <button onClick={() => setOpen(!open)} className="ml-auto inline-flex items-center gap-1 font-medium text-btc" aria-expanded={open}>
          Evidence ({m.evidence.length}) <ChevronDown size={12} className={open ? "rotate-180" : ""} />
        </button>
      </div>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {m.evidence.map((e) => (
            <li key={e.label} className="flex flex-wrap justify-between gap-2">
              <span className="text-muted">{e.label}</span>
              <span className="num">{typeof e.value === "object" ? "included (simulated)" : String(e.value)} <span className="text-muted">· {e.source}, {timeAgo(e.asOf)}{e.stale ? " (stale)" : ""}</span></span>
            </li>
          ))}
          {m.missing.map((x) => <li key={x} className="text-amber-600 dark:text-amber-400">Missing: {x}</li>)}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">Generated {timeAgo(m.generatedAt)} by {m.provider} ({m.model}). AI can be wrong. Not financial advice.</p>
    </div>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const status = useApi("/assistant/status");
  const [messages, setMessages] = useState([]);
  const [params, setParams] = useSearchParams();
  const txParam = params.get("tx");
  const txid = txParam && /^[0-9a-fA-F]{64}$/.test(txParam) ? txParam : null;
  const [input, setInput] = useState(txid ? "Explain this transaction in simple terms. Was the fee reasonable?" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [messages, busy]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setError(null);
    setInput("");
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const r = await api("/assistant/chat", { body: { message, history, includePortfolio: !!user.preferences?.aiIncludePortfolio, ...(txid && { txid }) } });
      setMessages((m) => [...m, { role: "assistant", content: r.answer, meta: r }]);
    } catch (e) {
      setError(e);
      if (e.code === "SECRET_DETECTED") setMessages((m) => m.slice(0, -1));
    } finally { setBusy(false); }
  }

  const s = status.data;
  return (
    <div>
      <PageHeader eyebrow="AI copilot" title="Bitcoin assistant"
        actions={s?.configured && <Badge tone="btc"><Sparkles size={12} /> {s.provider} · {s.model}</Badge>}>
        Answers use live market and fee data with sources, separate facts from speculation, and never ask for your keys.
      </PageHeader>

      {status.loading ? <Skeleton className="h-40" /> : s && !s.configured ? (
        <Card className="border-amber-500/30">
          <p className="font-medium">The AI assistant isn't configured on this server yet.</p>
          <p className="mt-1 text-sm text-muted">An administrator needs to set <code className="num">AI_PROVIDER</code> and <code className="num">AI_API_KEY</code> in <code className="num">server/.env</code> (see README). Everything else in Crypto Copilot works without it.</p>
        </Card>
      ) : (
        <Card className="flex h-[calc(100vh-260px)] min-h-[460px] flex-col p-0">
          <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
            {!messages.length && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot size={28} className="text-btc" aria-hidden />
                <p className="mt-3 font-medium">Ask anything about Bitcoin</p>
                <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((q) => <button key={q} onClick={() => send(q)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-btc hover:text-btc">{q}</button>)}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cx("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-btc text-navy-950" : "bg-surface-2 text-btc")} aria-hidden>
                  {m.role === "user" ? <User size={15} /> : <Bot size={15} />}
                </span>
                <div className={cx("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "bg-btc/10" : "border border-line")}>
                  {m.role === "user" ? m.content : <><div className="space-y-1 text-muted"><Rich text={m.content} /></div><Evidence m={m.meta} /></>}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted"><Bot size={15} className="animate-pulse text-btc" /> Checking live data and thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line p-3">
            {txid && (
              <p className="mb-2 flex items-center gap-2 text-xs text-muted">
                <Badge tone="btc">Transaction context</Badge>
                <span className="num truncate">{txid.slice(0, 16)}…</span> verified details are sent as evidence
                <button onClick={() => setParams({})} aria-label="Remove transaction context" className="ml-auto p-1 hover:text-ink"><X size={12} /></button>
              </p>
            )}
            {error && <div className="mb-2">{error.code === "SECRET_DETECTED"
              ? <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"><ShieldAlert size={16} className="mt-0.5 shrink-0" />{error.message}</p>
              : <ErrorState error={error} compact />}</div>}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <label htmlFor="ask" className="sr-only">Your question</label>
              <textarea id="ask" rows={1} value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about prices, fees, transactions, scams…" className="min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-btc" />
              <Button type="submit" loading={busy} aria-label="Send"><Send size={16} /></Button>
            </form>
            <p className="mt-1.5 text-[11px] text-muted">{input.length}/1000 · Up to 20 questions per hour · Never paste a seed phrase or private key.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
