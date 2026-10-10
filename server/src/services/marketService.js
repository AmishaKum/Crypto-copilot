import { cached } from "./cache.js";

const COINGECKO = "https://api.coingecko.com/api/v3";
const MEMPOOL = "https://mempool.space/api";

async function getJson(url) {
  const host = new URL(url).host;
  let res;
  try {
    res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  } catch {
    const err = new Error(`Could not reach ${host}`);
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status} for ${host}`);
    err.status = 502;
    throw err;
  }
  return res.json();
}

export function getBtcPrice() {
  return cached("btc-price", 60_000, async () => {
    const d = await getJson(
      `${COINGECKO}/simple/price?ids=bitcoin&vs_currencies=usd,inr&include_24hr_change=true&include_last_updated_at=true`
    );
    const b = d.bitcoin;
    return {
      usd: b.usd,
      inr: b.inr,
      change24h: { usd: b.usd_24h_change, inr: b.inr_24h_change },
      updatedAt: new Date(b.last_updated_at * 1000).toISOString(),
      source: "CoinGecko",
    };
  });
}

export function getFees() {
  return cached("btc-fees", 30_000, async () => {
    const f = await getJson(`${MEMPOOL}/v1/fees/recommended`);
    return {
      fastest: f.fastestFee,
      halfHour: f.halfHourFee,
      hour: f.hourFee,
      economy: f.economyFee,
      unit: "sat/vB",
      source: "mempool.space",
    };
  });
}
