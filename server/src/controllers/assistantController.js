import Portfolio from "../models/Portfolio.js";
import { ask, aiStatus } from "../services/ai/assistantService.js";
import { summarize } from "../services/portfolioService.js";
import { centsToUsd, satsToBtc } from "../utils/money.js";

export const status = (req, res) => res.json(aiStatus());

export async function chat(req, res) {
  const { message, includePortfolio, txid } = req.body;
  // Providers require the conversation to start with a user turn.
  const history = req.body.history.slice(req.body.history.findIndex((m) => m.role === "user") >>> 0);
  let portfolioSummary;
  if (includePortfolio) {
    const p = await Portfolio.findOne({ user: req.user._id });
    if (p) {
      // Only aggregate numbers are sent to the AI provider - no name, email or IDs.
      const s = summarize(p, null);
      portfolioSummary = {
        startingCashUsd: centsToUsd(s.startingCashCents), cashUsd: centsToUsd(s.cashCents), btc: satsToBtc(s.btcSats),
        avgCostUsdPerBtc: s.avgCostCentsPerBtc != null ? centsToUsd(s.avgCostCentsPerBtc) : null,
        realizedPnlUsd: centsToUsd(s.realizedPnlCents), simulatedFeesPaidUsd: centsToUsd(s.feesPaidCents), trades: s.tradeCount,
      };
    }
  }
  res.json(await ask({ message, history: history.length && history[0].role === "user" ? history : [], portfolioSummary, txid }));
}
