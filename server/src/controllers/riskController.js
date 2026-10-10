import { simulateRisk } from "../services/riskService.js";
import { getBtcSnapshot } from "../services/marketService.js";
import { HttpError } from "../utils/httpError.js";

export async function simulate(req, res) {
  let { priceUsd } = req.body;
  let priceSource = "user input";
  let priceAsOf = null;
  if (priceUsd == null) {
    try {
      const s = await getBtcSnapshot();
      priceUsd = s.usd.price;
      priceSource = s.stale ? `${s.source} (stale)` : s.source;
      priceAsOf = s.lastUpdated || s.fetchedAt;
    } catch {
      throw new HttpError(503, "Live price unavailable. Enter a BTC price manually to run the simulation.", "PRICE_UNAVAILABLE");
    }
  }
  res.json({ ...simulateRisk({ ...req.body, priceUsd }), priceSource, priceAsOf });
}
