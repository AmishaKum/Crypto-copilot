import { useParams } from "react-router-dom";
import NotFound from "./NotFound";

const DOCS = {
  privacy: {
    title: "Privacy",
    items: [
      "We store your name, email, a salted bcrypt hash of your password, your preferences and the data you create (virtual trades, alerts, learning progress).",
      "We never collect seed phrases, private keys, exchange credentials or bank details.",
      "AI questions are sent to the configured AI provider together with public market data. Your name and email are never included. Your virtual portfolio is included only if you turn that on in Settings.",
      "You can download all your data or permanently delete your account at any time from Settings.",
      "Authentication uses an HttpOnly cookie. We don't use advertising trackers.",
    ],
  },
  terms: {
    title: "Terms of use",
    items: [
      "Crypto Copilot is an educational product provided as-is, without warranties.",
      "The virtual portfolio uses simulated money. No real trades, deposits or withdrawals happen, and nothing has cash value.",
      "Market and blockchain data come from third parties (CoinGecko, mempool.space) and may be delayed, incomplete or unavailable.",
      "Don't misuse the service (automated scraping, abuse of the AI assistant, attempts to access other users' data).",
    ],
  },
  risk: {
    title: "Risk disclaimer",
    items: [
      "Nothing on Crypto Copilot is financial, investment, tax or legal advice.",
      "Bitcoin is highly volatile. Its price has fallen more than 50% several times in its history. You can lose all the money you invest.",
      "AI answers can be wrong. Always verify important information with primary sources.",
      "Risk simulator results are hypothetical illustrations, not predictions.",
      "Past performance does not indicate future results.",
    ],
  },
};

export default function Legal() {
  const doc = DOCS[useParams().doc];
  if (!doc) return <NotFound />;
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
      <ul className="mt-6 list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted">
        {doc.items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </article>
  );
}
