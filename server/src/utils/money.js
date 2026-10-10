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
