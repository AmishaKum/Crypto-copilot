import { useEffect, useRef } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { EXCHANGES } from "../lib/exchanges";

/** Warns that the user is leaving for a real exchange, then lists exchange links for `coin`. */
export default function BuyRealDialog({ coin, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!coin) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="buyreal-title">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <div className="card relative w-full max-w-md fade-in">
        <button ref={closeRef} onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded p-1 text-muted hover:text-ink"><X size={18} /></button>
        <h2 id="buyreal-title" className="font-display text-lg font-bold">Buy {coin.name} ({coin.symbol}) for real</h2>
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p><strong>You're leaving Crypto Copilot.</strong> These are real exchanges that use real money. We are not affiliated with them and don't handle your funds.</p>
            <p>Check the website address, use 2FA, and only invest what you can afford to lose. <strong>Never share your seed phrase or password with anyone.</strong></p>
            <p>In India, crypto gains are taxed and exchanges must be registered with FIU-IND. Check before you sign up.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {EXCHANGES.map((ex) => (
            <li key={ex.id}>
              <a href={ex.url(coin)} target="_blank" rel="noopener noreferrer" onClick={onClose}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm transition hover:border-btc hover:text-btc">
                <span><span className="font-medium">{ex.name}</span> <span className="text-xs text-muted">{ex.region}</span></span>
                <ExternalLink size={15} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted">Opens in a new tab. Not all coins are listed on every exchange. Not financial advice.</p>
      </div>
    </div>
  );
}
