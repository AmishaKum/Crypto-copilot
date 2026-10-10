import SimulatedTrade from "../models/SimulatedTrade.js";
import * as svc from "../services/portfolioService.js";
import { getBtcSnapshot } from "../services/marketService.js";
import { usdToCents, notionalCents } from "../utils/money.js";

async function currentPrice() {
  try {
    const s = await getBtcSnapshot();
    return { priceCents: usdToCents(s.usd.price), priceSource: s.source, priceAsOf: s.lastUpdated || s.fetchedAt, priceStale: s.stale };
  } catch {
    return { priceCents: null, priceSource: null, priceAsOf: null, priceStale: true };
  }
}

export async function get(req, res) {
  const [p, price] = await Promise.all([svc.getOrCreatePortfolio(req.user._id), currentPrice()]);
  res.json({ ...svc.summarize(p, price.priceCents), ...price });
}

export async function trade(req, res) {
  const { portfolio, trade } = await svc.executeTrade(req.user._id, req.body);
  res.status(201).json({ trade, portfolio: svc.summarize(portfolio, trade.priceCents) });
}

export async function history(req, res) {
  const [trades, p] = await Promise.all([
    SimulatedTrade.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200).lean(),
    svc.getOrCreatePortfolio(req.user._id),
  ]);
  // Equity after each trade, valued at that trade's price (oldest first for charts), starting from the opening balance.
  const ordered = [...trades].reverse();
  const curve = ordered.map((t) => ({ t: t.createdAt, equityCents: t.cashAfterCents + notionalCents(t.btcAfterSats, t.priceCents) }));
  if (curve.length && trades.length < 200) curve.unshift({ t: ordered[0].createdAt, equityCents: p.startingCashCents });
  res.json({ trades, curve });
}

export async function reset(req, res) {
  const p = await svc.resetPortfolio(req.user._id, req.body.startingUsd);
  res.json(svc.summarize(p, null));
}
