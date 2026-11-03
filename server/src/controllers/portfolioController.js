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

const csvCell = (v) => {
  const s = String(v ?? "");
  // Quote cells and neutralise spreadsheet formulas (CSV injection).
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export async function exportCsv(req, res) {
  const trades = await SimulatedTrade.find({ user: req.user._id }).sort({ createdAt: 1 }).lean();
  const header = ["date", "side", "btc", "price_usd", "value_usd", "fee_usd", "realized_pnl_usd", "cash_after_usd", "btc_after", "price_source"];
  const rows = trades.map((t) => [
    new Date(t.createdAt).toISOString(), t.side, (t.sats / 1e8).toFixed(8), (t.priceCents / 100).toFixed(2), (t.notionalCents / 100).toFixed(2),
    (t.feeCents / 100).toFixed(2), (t.realizedPnlCents / 100).toFixed(2), (t.cashAfterCents / 100).toFixed(2), (t.btcAfterSats / 1e8).toFixed(8), t.priceSource,
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="crypto-copilot-trades.csv"');
  res.send([header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
}
