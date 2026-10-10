import { Link } from "react-router-dom";

export default function Logo({ to = "/" }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-display text-lg font-bold tracking-tight" aria-label="Crypto Copilot home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btc text-navy-950" aria-hidden>₿</span>
      <span>Crypto<span className="text-btc">Copilot</span></span>
    </Link>
  );
}
