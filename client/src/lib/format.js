const locale = (c) => (c === "INR" ? "en-IN" : "en-US");

export function money(value, currency = "USD", { decimals } = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  const d = decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return new Intl.NumberFormat(locale(currency), { style: "currency", currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
}

export function compact(value, currency = "USD") {
  if (value == null) return "—";
  return new Intl.NumberFormat(locale(currency), { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function pct(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export const cents = (c, currency = "USD") => (c == null ? "—" : money(c / 100, currency, { decimals: 2 }));
export const signedCents = (c) => (c == null ? "—" : `${c >= 0 ? "+" : "−"}${money(Math.abs(c) / 100, "USD", { decimals: 2 })}`);
export const btc = (sats) => (sats == null ? "—" : `${(sats / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} BTC`);
export const num = (n) => (n == null ? "—" : n.toLocaleString("en-US"));

export function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}
