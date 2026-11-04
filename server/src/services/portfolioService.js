import Portfolio from "../models/Portfolio.js";
import SimulatedTrade from "../models/SimulatedTrade.js";
import { env } from "../config/env.js";
import { COINS, getCoinPrices } from "./marketService.js";
import { HttpError } from "../utils/httpError.js";
import { feeCents, usdToCents, usdToMicros, microsToCents, notionalFromMicros } from "../utils/money.js";

export const DEFAULT_START_USD = 10_000;
export const MIN_TRADE_CENTS = 100; // $1 minimum trade value
export const UNITS_PER_COIN = 100_000_000;

const toUnits = (amount) => Math.round(Number(amount) * UNITS_PER_COIN);
const holdingOf = (p, coin) => {
  const h = p.holdings?.get?.(coin);
  return { units: h?.units || 0, costBasisCents: h?.costBasisCents || 0 };
};

export async function getOrCreatePortfolio(userId) {
  const start = usdToCents(DEFAULT_START_USD);
  let p = await Portfolio.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, startingCashCents: start, cashCents: start, rev: 0 } },
    { upsert: true, new: true }
  );
  // One-time migration from the single-BTC model (btcSats/costBasisCents) to per-coin holdings.
  // $isDefault: older documents have no stored `rev`, so concurrency filters on it would never match.
  if (p.btcSats > 0 || p.$isDefault("rev")) {
    const btc = holdingOf(p, "bitcoin");
    p = await Portfolio.findOneAndUpdate(
      { _id: p._id },
      {
        $set: {
          "holdings.bitcoin": { units: btc.units + p.btcSats, costBasisCents: btc.costBasisCents + p.costBasisCents },
          btcSats: 0, costBasisCents: 0, rev: (p.rev || 0) + 1,
        },
      },
      { new: true }
    );
  }
  return p;
}

/** Live prices (micro-dollars) for all coins. Trades are refused on stale or missing prices - never on client-supplied prices. */
export async function livePrices() {
  let data;
  try {
    data = await getCoinPrices();
  } catch {
    throw new HttpError(503, "Live prices are unavailable, so simulated trading is paused. Try again shortly.", "PRICE_UNAVAILABLE");
  }
  if (data.stale) throw new HttpError(503, "Price data is stale, so simulated trading is paused. Try again shortly.", "PRICE_STALE");
  const micros = Object.fromEntries(Object.entries(data.prices).map(([id, p]) => [id, usdToMicros(p.usd)]));
  return { micros, raw: data.prices, source: data.source, asOf: data.fetchedAt };
}

/** Pure accounting for one trade against one coin holding. Throws on rule violations. */
export function computeTrade(state, { side, units, priceMicros, feeBps, symbol = "BTC" }) {
  if (!Number.isInteger(units) || units < 1) throw new HttpError(400, "Enter a larger amount.", "VALIDATION");
  const notional = notionalFromMicros(units, priceMicros);
  if (notional < MIN_TRADE_CENTS) throw new HttpError(400, "Minimum trade value is $1.", "VALIDATION");
  const fee = feeCents(notional, feeBps);
  if (side === "buy") {
    const total = notional + fee;
    if (total > state.cashCents) throw new HttpError(400, "Not enough virtual cash for this trade (including the simulated fee).", "INSUFFICIENT_CASH");
    return { notional, fee, realized: 0, cashDelta: -total, unitsDelta: units, basisDelta: total };
  }
  if (units > state.units) throw new HttpError(400, `You can't sell more ${symbol} than you hold in this simulation.`, "INSUFFICIENT_BALANCE");
  const proceeds = notional - fee;
  // Average-cost method: remove the proportional share of cost basis.
  const basisRemoved = units === state.units ? state.costBasisCents : Math.round((state.costBasisCents * units) / state.units);
  return { notional, fee, realized: proceeds - basisRemoved, cashDelta: proceeds, unitsDelta: -units, basisDelta: -basisRemoved };
}

/** Value of all holdings in cents at the given micro-dollar prices (coins without a price are skipped). */
function holdingsValue(p, micros) {
  let total = 0;
  for (const [coin, h] of p.holdings || []) if (h.units > 0 && micros[coin]) total += notionalFromMicros(h.units, micros[coin]);
  return total;
}

export async function executeTrade(userId, { coin = "bitcoin", side, amount, btc, usd }) {
  if (!COINS[coin]) throw new HttpError(400, "Unsupported coin.", "VALIDATION");
  const { micros, source, asOf } = await livePrices();
  const priceMicros = micros[coin];
  if (!priceMicros) throw new HttpError(503, `No live price for ${COINS[coin].name} right now. Try again shortly.`, "PRICE_UNAVAILABLE");
  const qty = amount ?? btc;
  const units = qty != null ? toUnits(qty) : Math.floor((usdToCents(usd) * 1e4 * UNITS_PER_COIN) / priceMicros);

  // Optimistic concurrency: the update only applies if the portfolio revision is unchanged since we read it.
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = await getOrCreatePortfolio(userId);
    const h = holdingOf(p, coin);
    const t = computeTrade({ cashCents: p.cashCents, ...h }, { side, units, priceMicros, feeBps: env.tradeFeeBps, symbol: COINS[coin].symbol });
    const next = { units: h.units + t.unitsDelta, costBasisCents: h.costBasisCents + t.basisDelta };
    const updated = await Portfolio.findOneAndUpdate(
      { _id: p._id, rev: p.rev },
      {
        $set: { [`holdings.${coin}`]: next },
        $inc: { cashCents: t.cashDelta, realizedPnlCents: t.realized, feesPaidCents: t.fee, tradeCount: 1, rev: 1 },
      },
      { new: true }
    );
    if (!updated) continue;
    const trade = await SimulatedTrade.create({
      user: userId, coin, side, sats: units, priceMicros, priceCents: microsToCents(priceMicros),
      notionalCents: t.notional, feeCents: t.fee, realizedPnlCents: t.realized,
      cashAfterCents: updated.cashCents, unitsAfter: next.units, btcAfterSats: holdingOf(updated, "bitcoin").units,
      equityAfterCents: updated.cashCents + holdingsValue(updated, micros), priceSource: source, priceAsOf: asOf,
    });
    return { portfolio: updated, trade, micros };
  }
  throw new HttpError(409, "Your portfolio changed during this trade. Please try again.", "CONFLICT");
}

/**
 * Portfolio summary. `prices` maps coin id -> { usd, change24hPct } (or is null when prices are unavailable).
 * Keeps the older BTC-only fields (btcSats, btcValueCents, avgCostCentsPerBtc, priceCents) for compatibility.
 */
export function summarize(p, prices) {
  const holdings = [];
  for (const [coin, h] of p.holdings || []) {
    if (!h.units || !COINS[coin]) continue;
    const priceMicros = prices?.[coin] ? usdToMicros(prices[coin].usd) : null;
    const valueCents = priceMicros ? notionalFromMicros(h.units, priceMicros) : null;
    holdings.push({
      coin, ...COINS[coin], units: h.units, amount: h.units / UNITS_PER_COIN, costBasisCents: h.costBasisCents,
      avgCostMicros: Math.round((h.costBasisCents * 1e4 * UNITS_PER_COIN) / h.units),
      priceMicros, valueCents, change24hPct: prices?.[coin]?.change24hPct ?? null,
      unrealizedPnlCents: valueCents != null ? valueCents - h.costBasisCents : null,
    });
  }
  const priced = holdings.every((h) => h.valueCents != null);
  const holdingsValueCents = priced ? holdings.reduce((s, h) => s + h.valueCents, 0) : null;
  const equity = holdingsValueCents != null ? p.cashCents + holdingsValueCents : null;
  for (const h of holdings) h.allocationPct = equity ? +((h.valueCents / equity) * 100).toFixed(2) : null;
  holdings.sort((a, b) => (b.valueCents ?? 0) - (a.valueCents ?? 0));
  const btc = holdings.find((h) => h.coin === "bitcoin");
  const costBasisCents = holdings.reduce((s, h) => s + h.costBasisCents, 0);
  return {
    startingCashCents: p.startingCashCents,
    cashCents: p.cashCents,
    holdings,
    holdingsValueCents,
    costBasisCents,
    realizedPnlCents: p.realizedPnlCents,
    unrealizedPnlCents: holdingsValueCents != null ? holdingsValueCents - costBasisCents : null,
    feesPaidCents: p.feesPaidCents,
    tradeCount: p.tradeCount,
    equityCents: equity,
    totalPnlCents: equity != null ? equity - p.startingCashCents : null,
    cashPct: equity ? +((p.cashCents / equity) * 100).toFixed(2) : null,
    feeBps: env.tradeFeeBps,
    // BTC-only fields kept for older clients and the risk simulator.
    btcSats: btc?.units || 0,
    btcValueCents: btc ? btc.valueCents : 0,
    avgCostCentsPerBtc: btc ? Math.round(btc.avgCostMicros / 1e4) : null,
    priceCents: prices?.bitcoin ? usdToCents(prices.bitcoin.usd) : null,
  };
}

export async function resetPortfolio(userId, startingUsd) {
  const start = usdToCents(startingUsd);
  await SimulatedTrade.deleteMany({ user: userId });
  return Portfolio.findOneAndUpdate(
    { user: userId },
    {
      $set: { startingCashCents: start, cashCents: start, holdings: {}, btcSats: 0, costBasisCents: 0, realizedPnlCents: 0, feesPaidCents: 0, tradeCount: 0 },
      $inc: { rev: 1 },
    },
    { upsert: true, new: true }
  );
}
