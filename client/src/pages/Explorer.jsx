import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Boxes, CheckCircle2, Clock, ExternalLink, HelpCircle, Search } from "lucide-react";
import { useApi } from "../lib/useApi";
import { num, timeAgo } from "../lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, Skeleton, SourceTag } from "../components/ui";

const HEX64 = /^[0-9a-fA-F]{64}$/;
const sats = (n) => (n == null ? "—" : `${num(n)} sats`);
const shortAddr = (a) => (a ? `${a.slice(0, 10)}…${a.slice(-6)}` : "—");

const GLOSSARY = [
  ["Confirmation", "Each block mined on top of the block containing a transaction adds one confirmation. More confirmations = harder to reverse."],
  ["Fee rate (sat/vB)", "Fee divided by the transaction's virtual size. Miners prioritise higher fee rates."],
  ["Virtual size (vB)", "Size measure that discounts witness (signature) data in SegWit transactions; weight ÷ 4."],
  ["Inputs / outputs", "Inputs spend coins from earlier transactions; outputs create new spendable amounts. Change usually returns to the sender."],
  ["Coinbase", "The first transaction in a block that creates new bitcoin as the miner's reward. It has no real inputs."],
];

function Row({ k, v, help }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted" title={help}>{k}</dt>
      <dd className="num break-all text-right">{v}</dd>
    </div>
  );
}

function TxResult({ txid }) {
  const { data: tx, error, loading, reload } = useApi(`/explorer/tx/${txid}`);
  if (loading) return <Skeleton className="h-72" />;
  if (error) return <ErrorState error={error.status === 404 ? "No transaction with this ID was found on Bitcoin mainnet. Check for typos, or it may not have been broadcast." : error} onRetry={error.status === 404 ? null : reload} />;
  const conf = tx.confirmations;
  return (
    <div className="grid gap-4 lg:grid-cols-3 fade-in">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          {tx.confirmed ? <Badge tone="up"><CheckCircle2 size={12} /> Confirmed</Badge> : <Badge tone="warn"><Clock size={12} /> Unconfirmed (in mempool)</Badge>}
          {tx.confirmed && <Badge>{num(conf)} confirmation{conf === 1 ? "" : "s"}</Badge>}
          <a href={tx.sourceUrl} target="_blank" rel="noreferrer" className="link ml-auto inline-flex items-center gap-1 text-xs">Verify on mempool.space <ExternalLink size={12} /></a>
        </div>
        <p className="num mt-3 break-all text-xs text-muted">{tx.txid}</p>
        <dl className="mt-4 divide-y divide-line">
          <Row k="Block" v={tx.blockHeight != null ? `#${num(tx.blockHeight)}` : "Not yet in a block"} />
          <Row k="Time" v={tx.blockTime ? `${new Date(tx.blockTime).toLocaleString()} (${timeAgo(tx.blockTime)})` : "—"} />
          <Row k="Fee" v={sats(tx.feeSats)} />
          <Row k="Fee rate" v={tx.feeRate != null ? `${tx.feeRate} sat/vB` : "—"} />
          <Row k="Virtual size" v={`${num(tx.vsize)} vB`} />
          <Row k="Total output" v={`${sats(tx.totalOutputSats)} (${(tx.totalOutputSats / 1e8).toFixed(8)} BTC)`} />
        </dl>
        <SourceTag className="mt-3" source={tx.source} at={tx.fetchedAt} />
      </Card>
      <Card>
        <CardHeader icon={HelpCircle} title="What this means" sub="Interpretation, based on the facts shown" />
        <ul className="space-y-3 text-sm text-muted">
          <li>{tx.confirmed
            ? conf >= 6 ? "This transaction has 6+ confirmations, which most services treat as final." : `It has ${conf} confirmation(s). Many services wait for more before treating large payments as final.`
            : "It's waiting in the mempool. Confirmation time depends on its fee rate compared with other pending transactions."}</li>
          <li>It spends {tx.inputCount} input{tx.inputCount === 1 ? "" : "s"} and creates {tx.outputCount} output{tx.outputCount === 1 ? "" : "s"}. {tx.outputCount === 2 && "Two outputs often means one payment plus change, but that can't be known for certain."}</li>
          {tx.inputs[0]?.coinbase && <li>This is a coinbase transaction: newly created bitcoin paid to a miner.</li>}
        </ul>
      </Card>
      <Card className="lg:col-span-3">
        <div className="grid gap-6 md:grid-cols-2">
          {[["Inputs", tx.inputs, tx.inputCount], ["Outputs", tx.outputs, tx.outputCount]].map(([title, list, total]) => (
            <div key={title}>
              <p className="label mb-2">{title} ({total})</p>
              <ul className="divide-y divide-line text-sm">
                {list.map((io, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2">
                    <span className="num truncate text-xs" title={io.address || ""}>{io.coinbase ? "Coinbase (new coins)" : io.address ? shortAddr(io.address) : io.type === "op_return" ? "OP_RETURN (data)" : "Non-standard script"}</span>
                    <span className="num shrink-0 text-xs">{sats(io.valueSats)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {tx.truncated && <p className="mt-3 text-xs text-muted">Showing the first 50 inputs/outputs. See the full list on mempool.space.</p>}
      </Card>
    </div>
  );
}

function BlockResult({ query }) {
  const { data: b, error, loading, reload } = useApi(`/explorer/block/${query}`);
  if (loading) return <Skeleton className="h-48" />;
  if (error) return <ErrorState error={error.status === 404 ? "No block found for that height or hash." : error} onRetry={error.status === 404 ? null : reload} />;
  return (
    <Card className="fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="btc"><Boxes size={12} /> Block #{num(b.height)}</Badge>
        {b.confirmations != null && <Badge>{num(b.confirmations)} confirmations</Badge>}
        <a href={b.sourceUrl} target="_blank" rel="noreferrer" className="link ml-auto inline-flex items-center gap-1 text-xs">Verify on mempool.space <ExternalLink size={12} /></a>
      </div>
      <dl className="mt-4 divide-y divide-line">
        <Row k="Hash" v={b.hash} />
        <Row k="Mined" v={`${new Date(b.time).toLocaleString()} (${timeAgo(b.time)})`} />
        <Row k="Transactions" v={num(b.txCount)} />
        <Row k="Size" v={`${num(b.sizeBytes)} bytes`} />
        <Row k="Previous block" v={b.previousHash} />
      </dl>
      <SourceTag className="mt-3" source={b.source} at={b.fetchedAt} />
    </Card>
  );
}

export default function Explorer() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") || "");
  const [error, setError] = useState(null);
  const q = params.get("q");
  const kind = q && HEX64.test(q) ? params.get("type") || "tx" : q && /^\d+$/.test(q) ? "block" : null;
  const blocks = useApi("/explorer/blocks", { refreshMs: 60_000 });

  function submit(e, type) {
    e?.preventDefault();
    const v = input.trim();
    setError(null);
    if (/^\d{1,7}$/.test(v)) return setParams({ q: v });
    if (!HEX64.test(v)) return setError("Enter a 64-character transaction ID (hex) or a block height (number).");
    setParams({ q: v, type: type || "tx" });
  }

  return (
    <div>
      <PageHeader eyebrow="Blockchain explorer" title="Transaction Detective">
        Inspect any Bitcoin transaction or block. Data comes straight from mempool.space; explanations are labelled as interpretation.
      </PageHeader>
      <Card className="mb-4">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">Transaction ID or block height</label>
          <Input id="q" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Transaction ID (64 hex chars) or block height" className="num" spellCheck={false} autoComplete="off" />
          <Button type="submit"><Search size={16} /> Search</Button>
          <Button type="button" variant="ghost" className="whitespace-nowrap" onClick={() => submit(null, "block")} title="Treat a 64-character hash as a block hash">Block hash</Button>
        </form>
        {error && <p className="mt-2 text-xs text-rose-500" role="alert">{error}</p>}
      </Card>

      {kind === "tx" && <TxResult key={q} txid={q} />}
      {kind === "block" && <BlockResult key={q} query={q} />}

      {!kind && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader icon={Boxes} title="Latest blocks" sub="Click a block to inspect it" />
            {blocks.loading ? <Skeleton className="h-48" /> : blocks.error ? <ErrorState error={blocks.error} onRetry={blocks.reload} /> : !blocks.data.blocks.length ? <EmptyState title="No blocks returned" /> : (
              <ul className="divide-y divide-line">
                {blocks.data.blocks.map((b) => (
                  <li key={b.hash}>
                    <button onClick={() => { setInput(String(b.height)); setParams({ q: String(b.height) }); }} className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm hover:text-btc">
                      <span className="num font-medium">#{num(b.height)}</span>
                      <span className="text-muted">{num(b.txCount)} txs</span>
                      <span className="hidden text-muted sm:inline">{b.medianFeeRate != null ? `~${Math.round(b.medianFeeRate)} sat/vB median` : ""}</span>
                      <span className="text-xs text-muted">{timeAgo(b.time)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {blocks.data && <SourceTag className="mt-3" source={blocks.data.source} at={blocks.data.fetchedAt} stale={blocks.data.stale} />}
          </Card>
          <Card>
            <CardHeader icon={HelpCircle} title="Glossary" />
            <dl className="space-y-3 text-sm">
              {GLOSSARY.map(([t, d]) => <div key={t}><dt className="font-medium">{t}</dt><dd className="text-muted">{d}</dd></div>)}
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
