import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-[1fr_auto]">
        <p className="max-w-xl text-xs leading-relaxed text-muted">
          <strong className="text-ink">Risk disclaimer:</strong> Crypto Copilot is an educational tool. Nothing here is financial,
          investment, tax or legal advice. Cryptoassets are highly volatile and you can lose money. The virtual portfolio uses
          simulated money only. We never ask for seed phrases or private keys.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-muted">
          <a className="hover:text-ink" href="https://github.com/AmishaKum/Crypto-copilot#readme" target="_blank" rel="noreferrer">Docs</a>
          <Link className="hover:text-ink" to="/legal/privacy">Privacy</Link>
          <Link className="hover:text-ink" to="/legal/terms">Terms</Link>
          <Link className="hover:text-ink" to="/legal/risk">Risk</Link>
        </nav>
      </div>
    </footer>
  );
}
