import { btcToSats, usdToCents, notionalCents } from "../utils/money.js";

/**
 * Hypothetical price-shock analysis. Pure function: no data access.
 * portfolios: [{ label, btc, cashUsd }], shocks: percent moves e.g. -30, 10.
 */
export function simulateRisk({ priceUsd, portfolios, shocks }) {
  const priceCents = usdToCents(priceUsd);
  return {
    priceCents,
    results: portfolios.map((pf) => {
      const sats = btcToSats(pf.btc);
      const cash = usdToCents(pf.cashUsd);
      const btcNow = notionalCents(sats, priceCents);
      const equityNow = cash + btcNow;
      return {
        label: pf.label,
        btcSats: sats,
        cashCents: cash,
        equityCents: equityNow,
        btcSharePct: equityNow > 0 ? +((btcNow / equityNow) * 100).toFixed(2) : 0,
        scenarios: shocks.map((s) => {
          const shockedPrice = Math.round(priceCents * (1 + s / 100));
          const equity = cash + notionalCents(sats, shockedPrice);
          return {
            shockPct: s,
            priceCents: shockedPrice,
            equityCents: equity,
            changeCents: equity - equityNow,
            changePct: equityNow > 0 ? +(((equity - equityNow) / equityNow) * 100).toFixed(2) : 0,
          };
        }),
      };
    }),
    assumptions: [
      "Only the BTC price changes; cash stays constant.",
      "Instant, frictionless price move: no fees, slippage or liquidity effects.",
      "Hypothetical scenarios, not forecasts or financial advice.",
    ],
  };
}
