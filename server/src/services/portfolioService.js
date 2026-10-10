import Portfolio from "../models/Portfolio.js";
import SimulatedTrade from "../models/SimulatedTrade.js";
import { env } from "../config/env.js";
import { getBtcSnapshot } from "./marketService.js";
import { HttpError } from "../utils/httpError.js";
import { notionalCents, feeCents, usdToCents, btcToSats } from "../utils/money.js";

export const DEFAULT_START_USD = 10_000;
export const MIN_TRADE_SATS = 1_000; // 0.00001 BTC

export async function getOrCreatePortfolio(userId) {
  const start = usdToCents(DEFAULT_START_USD);
  return Portfolio.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, startingCashCents: start, cashCents: start } },
    { upsert: true, new: true }
  );
}

/** Live BTC/USD price in cents. Trades are refused on stale or missing prices - never on client-supplied prices. */
export async function livePriceCents() {
  let snap;
  try {
    snap = await getBtcSnapshot();
  } catch {
    throw new HttpError(503, "Live BTC price is unavailable, so simulated trading is paused. Try again shortly.", "PRICE_UNAVAILABLE");
  }
  if (snap.stale) throw new HttpError(503, "BTC price data is stale, so simulated trading is paused. Try again shortly.", "PRICE_STALE");
  return { priceCents: usdToCents(snap.usd.price), source: snap.source, asOf: snap.lastUpdated || snap.fetchedAt };
}

/** Pure accounting for a trade against a portfolio state. Throws on rule violations. */
export function computeTrade(state, { side, sats, priceCents, feeBps }) {
  if (!Number.isInteger(sats) || sats < MIN_TRADE_SATS) throw new HttpError(400, "Minimum trade is 0.00001 BTC.", "VALIDATION");
  const notional = notionalCents(sats, priceCents);
  const fee = feeCents(notional, feeBps);
  if (side === "buy") {
    const total = notional + fee;
    if (total > state.cashCents) throw new HttpError(400, "Not enough virtual cash for this trade (including the simulated fee).", "INSUFFICIENT_CASH");
    return { notional, fee, realized: 0, cashDelta: -total, satsDelta: sats, basisDelta: total };
  }
  if (sats > state.btcSats) throw new HttpError(400, "You can't sell more BTC than you hold in this simulation.", "INSUFFICIENT_BTC");
  const proceeds = notional - fee;
  // Average-cost method: remove the proportional share of cost basis.
  const basisRemoved = sats === state.btcSats ? state.costBasisCents : Math.round((state.costBasisCents * sats) / state.btcSats);
  return { notional, fee, realized: proceeds - basisRemoved, cashDelta: proceeds, satsDelta: -sats, basisDelta: -basisRemoved };
}

export async function executeTrade(userId, { side, btc, usd }) {
  const { priceCents, source, asOf } = await livePriceCents();
  const sats = btc != null ? btcToSats(btc) : Math.floor((usdToCents(usd) * 1e8) / priceCents);

  // Optimistic concurrency: the update only applies if the portfolio is unchanged since we read it.
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = await getOrCreatePortfolio(userId);
    const t = computeTrade(p, { side, sats, priceCents, feeBps: env.tradeFeeBps });
    const updated = await Portfolio.findOneAndUpdate(
      { _id: p._id, cashCents: p.cashCents, btcSats: p.btcSats, costBasisCents: p.costBasisCents },
      {
        $inc: {
          cashCents: t.cashDelta, btcSats: t.satsDelta, costBasisCents: t.basisDelta,
          realizedPnlCents: t.realized, feesPaidCents: t.fee, tradeCount: 1,
        },
      },
      { new: true }
    );
    if (!updated) continue;
    const trade = await SimulatedTrade.create({
      user: userId, side, sats, priceCents, notionalCents: t.notional, feeCents: t.fee, realizedPnlCents: t.realized,
      cashAfterCents: updated.cashCents, btcAfterSats: updated.btcSats, priceSource: source, priceAsOf: asOf,
    });
    return { portfolio: updated, trade };
  }
  throw new HttpError(409, "Your portfolio changed during this trade. Please try again.", "CONFLICT");
}

export function summarize(p, priceCents) {
  const btcValue = priceCents != null ? notionalCents(p.btcSats, priceCents) : null;
  const equity = btcValue != null ? p.cashCents + btcValue : null;
  return {
    startingCashCents: p.startingCashCents,
    cashCents: p.cashCents,
    btcSats: p.btcSats,
    costBasisCents: p.costBasisCents,
    avgCostCentsPerBtc: p.btcSats > 0 ? Math.round((p.costBasisCents * 1e8) / p.btcSats) : null,
    realizedPnlCents: p.realizedPnlCents,
    feesPaidCents: p.feesPaidCents,
    tradeCount: p.tradeCount,
    priceCents,
    btcValueCents: btcValue,
    unrealizedPnlCents: btcValue != null ? btcValue - p.costBasisCents : null,
    equityCents: equity,
    totalPnlCents: equity != null ? equity - p.startingCashCents : null,
    feeBps: env.tradeFeeBps,
  };
}

export async function resetPortfolio(userId, startingUsd) {
  const start = usdToCents(startingUsd);
  await SimulatedTrade.deleteMany({ user: userId });
  return Portfolio.findOneAndUpdate(
    { user: userId },
    { $set: { startingCashCents: start, cashCents: start, btcSats: 0, costBasisCents: 0, realizedPnlCents: 0, feesPaidCents: 0, tradeCount: 0 } },
    { upsert: true, new: true }
  );
}
