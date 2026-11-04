import SimulatedTrade from "../models/SimulatedTrade.js";
import * as svc from "../services/portfolioService.js";
import { COINS, getCoinPrices } from "../services/marketService.js";
import { notionalCents } from "../utils/money.js";

async function currentPrices() {
  try {
    const d = await getCoinPrices();
    return { prices: d.prices, meta: { priceSource: d.source, priceAsOf: d.fetchedAt, priceStale: d.stale } };
  } catch {
    return { prices: null, meta: { priceSource: null, priceAsOf: null, priceStale: true } };
  }
}

export async function get(req, res) {
  const [p, { prices, meta }] = await Promise.all([svc.getOrCreatePortfolio(req.user._id), currentPrices()]);
  res.json({ ...svc.summarize(p, prices), ...meta });
}

export async function trade(req, res) {
  const { portfolio, trade } = await svc.executeTrade(req.user._id, req.body);
  const { prices } = await currentPrices();
  res.status(201).json({ trade, portfolio: svc.summarize(portfolio, prices) });
}

export const coins = (req, res) => res.json({ coins: Object.entries(COINS).map(([id, c]) => ({ id, ...c })) });

export async function history(req, res) {
  const [trades, p] = await Promise.all([
    SimulatedTrade.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200).lean(),
    svc.getOrCreatePortfolio(req.user._id),
  ]);
  // Equity after each trade, valued at that trade's price (oldest first for charts), starting from the opening balance.
  const ordered = [...trades].reverse();
  // Newer trades store the whole-portfolio value; older BTC-only trades are valued from their BTC balance.
  const curve = ordered.map((t) => ({ t: t.createdAt, equityCents: t.equityAfterCents ?? t.cashAfterCents + notionalCents(t.btcAfterSats, t.priceCents) }));
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
  const header = ["date", "coin", "symbol", "side", "amount", "price_usd", "value_usd", "fee_usd", "realized_pnl_usd", "cash_after_usd", "coin_balance_after", "price_source"];
  const rows = trades.map((t) => {
    const coin = t.coin || "bitcoin";
    const price = t.priceMicros != null ? t.priceMicros / 1e6 : t.priceCents / 100;
    return [
      new Date(t.createdAt).toISOString(), coin, COINS[coin]?.symbol || "", t.side, (t.sats / 1e8).toFixed(8), price.toFixed(price < 1 ? 6 : 2),
      (t.notionalCents / 100).toFixed(2), (t.feeCents / 100).toFixed(2), (t.realizedPnlCents / 100).toFixed(2), (t.cashAfterCents / 100).toFixed(2),
      ((t.unitsAfter ?? t.btcAfterSats) / 1e8).toFixed(8), t.priceSource,
    ];
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="crypto-copilot-trades.csv"');
  res.send([header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
}
