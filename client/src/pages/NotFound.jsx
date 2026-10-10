import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="num text-6xl font-bold text-btc">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold">This block doesn't exist</h1>
      <p className="mt-1 text-sm text-muted">The page you're looking for isn't on our chain.</p>
      <Link to="/" className="mt-6 rounded-xl bg-btc px-4 py-2 text-sm font-semibold text-navy-950">Go home</Link>
    </div>
  );
}
