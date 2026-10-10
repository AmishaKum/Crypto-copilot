import { Link } from "react-router-dom";
import { ArrowRight, Bell, Boxes, GraduationCap, Lock, Search, ShieldAlert, ShieldCheck, Sparkles, Wallet, EyeOff, KeyRound } from "lucide-react";
import { useApi } from "../lib/useApi";
import { money, pct, timeAgo } from "../lib/format";
import { Badge, Skeleton, SourceTag } from "../components/ui";

const FEATURES = [
  { icon: Sparkles, title: "AI Bitcoin assistant", text: "Ask why the market moved or what a term means. Answers cite the live data they use and flag what's uncertain." },
  { icon: Search, title: "Transaction detective", text: "Paste a transaction ID to see confirmations, fees and inputs/outputs, explained in plain language." },
  { icon: Wallet, title: "Virtual portfolio", text: "Practice buying and selling BTC at live prices with simulated money. Track fees and profit/loss honestly." },
  { icon: ShieldAlert, title: "Risk simulator", text: "See what a 10%, 30% or 50% crash would do to a portfolio before it happens, with the maths shown." },
  { icon: Bell, title: "Smart alerts", text: "In-app alerts when BTC crosses your price or network fees drop below your target." },
  { icon: GraduationCap, title: "Crypto academy", text: "Short lessons, quizzes and a scam dojo that trains you to spot the tricks that cost people money." },
];

const FAQ = [
  ["Is Crypto Copilot free?", "Yes. The MVP is free to use. It runs on free tiers of public data providers, so data can occasionally be delayed or rate-limited; when that happens we tell you instead of guessing."],
  ["Do I need a wallet or exchange account?", "No. Nothing here touches real money. The portfolio is a simulation and we never ask for keys, seed phrases or exchange logins."],
  ["Where does the data come from?", "Market data from CoinGecko and blockchain data from mempool.space. Every number shows its source and when it was last updated."],
  ["Can the AI tell me what to buy?", "No. It explains data and concepts, separates facts from speculation and never guarantees outcomes. It is not financial advice."],
  ["Is INR supported?", "Yes. Prices, charts and the dashboard can be shown in Indian rupees or US dollars. The virtual portfolio is accounted in USD."],
];

function LiveTicker() {
  const { data, error, loading } = useApi("/market/snapshot", { refreshMs: 60_000 });
  const fees = useApi("/market/fees", { refreshMs: 60_000 });
  return (
    <div className="card w-full max-w-sm fade-in p-6 shadow-xl shadow-btc/5">
      <div className="flex items-center justify-between">
        <p className="label">Live snapshot</p>
        <span className="flex items-center gap-1.5 text-[11px] text-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> live</span>
      </div>
      {loading ? <Skeleton className="mt-4 h-24" /> : error && !data ? (
        <p className="mt-4 text-sm text-muted">Live market data is temporarily unavailable. {error.message}</p>
      ) : (
        <>
          <p className="num mt-3 text-3xl font-semibold">{money(data.usd.price, "USD")}</p>
          <p className="num text-sm text-muted">{money(data.inr.price, "INR")}</p>
          <div className="mt-3 flex gap-2">
            <Badge tone={data.usd.change24hPct >= 0 ? "up" : "down"}>{pct(data.usd.change24hPct)} 24h</Badge>
            {fees.data && <Badge tone="btc">Next block: {fees.data.fastest} sat/vB</Badge>}
          </div>
          <SourceTag className="mt-4" source="CoinGecko · mempool.space" at={data.lastUpdated || data.fetchedAt} stale={data.stale} />
        </>
      )}
    </div>
  );
}

function RecentBlocks() {
  const { data, error, loading } = useApi("/explorer/blocks");
  if (loading) return <Skeleton className="h-40" />;
  if (error) return <p className="text-sm text-muted">Recent blocks are unavailable right now.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {data.blocks.slice(0, 5).map((b) => (
        <li key={b.hash} className="flex items-center justify-between py-2.5">
          <span className="flex items-center gap-2"><Boxes size={14} className="text-btc" aria-hidden /><span className="num">#{b.height.toLocaleString()}</span></span>
          <span className="text-muted">{b.txCount.toLocaleString()} txs</span>
          <span className="text-xs text-muted">{timeAgo(b.time)}</span>
        </li>
      ))}
    </ul>
  );
}

const Section = ({ id, eyebrow, title, children, className = "" }) => (
  <section id={id} className={`mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20 ${className}`}>
    {eyebrow && <p className="label text-btc">{eyebrow}</p>}
    <h2 className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
    <div className="mt-8">{children}</div>
  </section>
);

export default function Landing() {
  return (
    <>
      <div className="grid-glow border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr]">
          <div className="fade-in">
            <Badge tone="btc">Bitcoin intelligence · for learners</Badge>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Understand Bitcoin <span className="text-btc">before</span> you risk real money.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
              Live market and blockchain data, an AI copilot that shows its sources, and a risk-free simulator to practice with, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-btc px-6 font-semibold text-navy-950 hover:bg-btc-soft">
                Start free <ArrowRight size={18} aria-hidden />
              </Link>
              <Link to="/app" className="inline-flex h-12 items-center rounded-xl border border-line px-6 font-medium hover:border-btc hover:text-btc">Open dashboard</Link>
            </div>
            <p className="mt-4 text-xs text-muted">No card. No wallet. No real trading.</p>
          </div>
          <div className="flex justify-center lg:justify-end"><LiveTicker /></div>
        </div>
      </div>

      <Section id="features" eyebrow="What you get" title="One copilot for learning, investigating and practicing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-btc/10 text-btc"><Icon size={18} aria-hidden /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="AI with receipts" title="Answers that show their evidence, and their limits" className="border-t border-line">
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="space-y-4 text-sm text-muted">
            <li><strong className="text-ink">Uses live data.</strong> Current price, 24h range, volume and fees are pulled server-side and passed to the AI with timestamps.</li>
            <li><strong className="text-ink">Separates fact from guesswork.</strong> Answers are split into what the data shows, the explanation, and what's uncertain.</li>
            <li><strong className="text-ink">Data-quality indicator.</strong> If a source is missing or stale, the answer says so and the confidence badge drops.</li>
            <li><strong className="text-ink">Protects you.</strong> Messages that look like a seed phrase or private key are blocked before they reach the AI provider.</li>
          </ul>
          <div className="card text-sm">
            <p className="label">Example answer layout</p>
            <p className="mt-3 font-medium">"Why are fees high right now?"</p>
            <div className="mt-3 space-y-2 text-muted">
              <p><strong className="text-ink">What the data shows:</strong> next-block fee rate and 24h price change, quoted with source and time.</p>
              <p><strong className="text-ink">Explanation:</strong> how blockspace demand sets fee rates.</p>
              <p><strong className="text-ink">Uncertainty:</strong> causes that can't be confirmed from the data.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Badge tone="up">Data quality: high</Badge><Badge>Sources: CoinGecko, mempool.space</Badge></div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Blockchain explorer" title="Read the chain like a detective" className="border-t border-line">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <p className="label mb-3">Latest blocks · live from mempool.space</p>
            <RecentBlocks />
          </div>
          <div className="space-y-4 text-sm text-muted">
            <p>Look up any transaction by its 64-character ID. We show status, confirmations, fee and fee rate, inputs and outputs, then explain each term in plain English.</p>
            <p>Every result links to the original explorer so you can verify it yourself. Facts come from the blockchain; anything interpretive is labelled as such.</p>
            <Link to="/app/explorer" className="link inline-flex items-center gap-1">Try the transaction detective <ArrowRight size={14} /></Link>
          </div>
        </div>
      </Section>

      <Section eyebrow="Paper trading" title="Practice with $10,000 of virtual money" className="border-t border-line">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="flex items-center justify-between"><p className="label">Portfolio preview</p><Badge tone="warn">Illustration, not real results</Badge></div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[["Virtual cash", "Starts at $10,000"], ["BTC held", "Bought at live prices"], ["Fees", "0.10% per simulated trade"], ["P&L", "Realized + unrealized, average-cost"]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
          <p className="text-sm text-muted">Trades execute against the live CoinGecko price on our server; you can't fake a fill. Balances are calculated server-side in whole cents and satoshis, so the numbers add up exactly. Reset anytime.</p>
        </div>
      </Section>

      <Section id="security" eyebrow="Security & privacy" title="Built so there's nothing to steal" className="border-t border-line">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [KeyRound, "No keys, ever", "We never ask for or store seed phrases, private keys or exchange logins."],
            [Lock, "Secure accounts", "Bcrypt-hashed passwords, HttpOnly session cookies, rate-limited logins."],
            [EyeOff, "Minimal data", "AI requests never include your name or email. Export or delete your data anytime."],
            [ShieldCheck, "No real money", "No deposits, withdrawals, custody or real trading. It's a learning environment."],
          ].map(([Icon, t, d]) => (
            <div key={t} className="card"><Icon size={18} className="text-btc" aria-hidden /><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Crypto academy" title="Learn the essentials in minutes a day" className="border-t border-line">
        <div className="flex flex-wrap gap-2">
          {["Bitcoin basics", "How the blockchain works", "Fees & confirmations", "Keys & wallets", "Scam dojo", "Volatility", "Risk management", "Exchange safety"].map((t) => (
            <span key={t} className="rounded-full border border-line px-3 py-1.5 text-sm">{t}</span>
          ))}
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Questions, answered" className="border-t border-line">
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{q}<span className="text-btc transition group-open:rotate-45" aria-hidden>+</span></summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold">Ready to get smarter about Bitcoin?</h2>
          <Link to="/register" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-btc px-6 font-semibold text-navy-950 hover:bg-btc-soft">Create a free account <ArrowRight size={18} /></Link>
        </div>
      </div>
    </>
  );
}
