import { env } from "../config/env.js";
import { cached } from "./cache.js";
import { upstream } from "./http.js";
import { HttpError } from "../utils/httpError.js";

// URL overrides exist for local end-to-end testing against a stub server.
const COINGECKO = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
const MEMPOOL = process.env.MEMPOOL_API_URL || "https://mempool.space/api";

// CoinGecko ids users may add to a watchlist. The MVP focuses on Bitcoin; others are for comparison only.
// CoinGecko ids supported for watchlists and simulated trading.
export const COINS = {
  bitcoin: { name: "Bitcoin", symbol: "BTC" }, ethereum: { name: "Ethereum", symbol: "ETH" }, solana: { name: "Solana", symbol: "SOL" },
  binancecoin: { name: "BNB", symbol: "BNB" }, ripple: { name: "XRP", symbol: "XRP" }, cardano: { name: "Cardano", symbol: "ADA" },
  dogecoin: { name: "Dogecoin", symbol: "DOGE" }, litecoin: { name: "Litecoin", symbol: "LTC" }, polkadot: { name: "Polkadot", symbol: "DOT" },
  chainlink: { name: "Chainlink", symbol: "LINK" },
};
export const WATCHABLE = Object.fromEntries(Object.entries(COINS).map(([id, c]) => [id, c.name]));
export const CHART_DAYS = [1, 7, 30, 90, 365];

const cg = (path) =>
  upstream(`${COINGECKO}${path}`, {
    name: "CoinGecko",
    headers: env.coingeckoApiKey ? { "x-cg-demo-api-key": env.coingeckoApiKey } : {},
  });

const meta = (r, source) => ({ source, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale, ...(r.stale && { staleReason: r.staleReason }) });

export async function getBtcSnapshot() {
  const r = await cached("btc-snapshot", 60_000, async () => {
    const d = await cg("/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false");
    const m = d.market_data;
    const pick = (c) => ({
      price: m.current_price?.[c] ?? null,
      high24h: m.high_24h?.[c] ?? null,
      low24h: m.low_24h?.[c] ?? null,
      marketCap: m.market_cap?.[c] ?? null,
      volume24h: m.total_volume?.[c] ?? null,
      change24hPct: m.price_change_percentage_24h_in_currency?.[c] ?? null,
    });
    if (typeof m.current_price?.usd !== "number") throw new HttpError(502, "CoinGecko returned no BTC price.", "UPSTREAM_ERROR");
    return { usd: pick("usd"), inr: pick("inr"), lastUpdated: m.last_updated || d.last_updated };
  });
  return { ...r.value, ...meta(r, "CoinGecko") };
}

export async function getBtcChart(days, currency) {
  const vs = currency.toLowerCase();
  const r = await cached(`btc-chart-${vs}-${days}`, days === 1 ? 120_000 : 600_000, async () => {
    const d = await cg(`/coins/bitcoin/market_chart?vs_currency=${vs}&days=${days}`);
    const pts = d.prices || [];
    const step = Math.max(1, Math.ceil(pts.length / 200)); // downsample for the browser
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(([t, p]) => ({ t, p }));
  });
  return { days, currency, points: r.value, ...meta(r, "CoinGecko") };
}

export async function getWatchPrices(ids) {
  const valid = [...new Set(ids)].filter((id) => WATCHABLE[id]).sort();
  if (!valid.length) return { items: [], source: "CoinGecko", fetchedAt: new Date().toISOString(), stale: false };
  const r = await cached(`watch-${valid.join(",")}`, 60_000, () =>
    cg(`/simple/price?ids=${valid.join(",")}&vs_currencies=usd,inr&include_24hr_change=true`)
  );
  const items = valid.map((id) => ({
    id,
    name: WATCHABLE[id],
    usd: r.value[id]?.usd ?? null,
    inr: r.value[id]?.inr ?? null,
    change24hPct: r.value[id]?.usd_24h_change ?? null,
  }));
  return { items, ...meta(r, "CoinGecko") };
}

export async function getFees() {
  const r = await cached("btc-fees", 30_000, () => upstream(`${MEMPOOL}/v1/fees/recommended`, { name: "mempool.space" }));
  const f = r.value;
  return {
    fastest: f.fastestFee, halfHour: f.halfHourFee, hour: f.hourFee, economy: f.economyFee, minimum: f.minimumFee,
    unit: "sat/vB", ...meta(r, "mempool.space"),
  };
}

export const HALVING_INTERVAL = 210_000;

/** Pure halving maths from the current block height. */
export function halvingInfo(height, now = Date.now()) {
  const nextHalvingHeight = (Math.floor(height / HALVING_INTERVAL) + 1) * HALVING_INTERVAL;
  const blocksLeft = nextHalvingHeight - height;
  const era = Math.floor(height / HALVING_INTERVAL);
  return {
    height,
    nextHalvingHeight,
    blocksLeft,
    estimatedDate: new Date(now + blocksLeft * 10 * 60_000).toISOString(), // ~10 minutes per block
    blockRewardBtc: 50 / 2 ** era,
    nextBlockRewardBtc: 50 / 2 ** (era + 1),
    progressPct: +(((HALVING_INTERVAL - blocksLeft) / HALVING_INTERVAL) * 100).toFixed(2),
  };
}

/** Network status: tip height, halving countdown and mempool backlog (mempool.space). */
export async function getNetwork() {
  const r = await cached("btc-network", 60_000, async () => {
    const [height, mempool] = await Promise.all([
      upstream(`${MEMPOOL}/blocks/tip/height`, { name: "mempool.space", text: true }).then(Number),
      upstream(`${MEMPOOL}/mempool`, { name: "mempool.space" }),
    ]);
    return { ...halvingInfo(height), mempool: { txCount: mempool.count, vsize: mempool.vsize, totalFeeSats: mempool.total_fee } };
  });
  return { ...r.value, ...meta(r, "mempool.space") };
}

/** Live USD/INR prices and 24h change for every supported coin, in one cached request. */
export async function getCoinPrices() {
  const ids = Object.keys(COINS).sort().join(",");
  const r = await cached("coin-prices", 60_000, () => cg(`/simple/price?ids=${ids}&vs_currencies=usd,inr&include_24hr_change=true`));
  const prices = {};
  for (const id of Object.keys(COINS)) {
    const p = r.value[id];
    if (typeof p?.usd === "number") prices[id] = { usd: p.usd, inr: p.inr ?? null, change24hPct: p.usd_24h_change ?? null };
  }
  return { prices, ...meta(r, "CoinGecko") };
}
