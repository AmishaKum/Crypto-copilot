// All money is stored as integers: USD cents and satoshis. Never floats.
export const SATS_PER_BTC = 100_000_000;

export const btcToSats = (btc) => Math.round(Number(btc) * SATS_PER_BTC);
export const satsToBtc = (sats) => sats / SATS_PER_BTC;
export const usdToCents = (usd) => Math.round(Number(usd) * 100);
export const centsToUsd = (cents) => cents / 100;

/** Value in cents of `sats` at `priceCents` per BTC, rounded half-up, using BigInt to avoid overflow. */
export function notionalCents(sats, priceCents) {
  const n = BigInt(sats) * BigInt(priceCents);
  const d = BigInt(SATS_PER_BTC);
  return Number((n + d / 2n) / d);
}

/** Fee in cents for a notional amount at `bps` basis points, rounded half-up. */
export const feeCents = (notional, bps) => Math.round((notional * bps) / 10_000);

// Prices are kept in micro-dollars (1e-6 USD) so low-priced coins (e.g. $0.1234) stay exact.
export const usdToMicros = (usd) => Math.round(Number(usd) * 1e6);
export const microsToCents = (micros) => Math.round(micros / 1e4);

/** Value in cents of `units` (1e-8 of a coin) at `priceMicros` per coin, rounded half-up with BigInt. */
export function notionalFromMicros(units, priceMicros) {
  const n = BigInt(units) * BigInt(priceMicros);
  const d = 10n ** 12n; // 1e8 units/coin * 1e4 micros/cent
  return Number((n + d / 2n) / d);
}
