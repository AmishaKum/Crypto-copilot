export function money(value, currency = "USD") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value);
}

export function pct(value) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
