import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, H, mockUpstream, coingeckoCoin, feesBody } from "./helpers.js";
import { clearCache } from "../src/services/cache.js";

const TXID = "a".repeat(64);
beforeEach(() => clearCache());

describe("platform", () => {
  it("health works without a database", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body).toMatchObject({ status: "ok", db: "disconnected" });
  });
  it("sets security headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("rejects state-changing requests without the CSRF header", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(403);
  });
  it("account routes return 503 when DB is down", async () => {
    const res = await request(app).post("/api/auth/login").set(H).send({ email: "a@b.co", password: "x" });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("DB_UNAVAILABLE");
  });
  it("404 for unknown API routes", async () => {
    expect((await request(app).get("/api/nope")).status).toBe(404);
  });
});

describe("market data", () => {
  it("maps the CoinGecko snapshot (USD + INR) with freshness info", async () => {
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin() });
    const res = await request(app).get("/api/market/snapshot");
    expect(res.status).toBe(200);
    expect(res.body.usd).toMatchObject({ price: 50_000, change24hPct: 1.5, marketCap: 1e12 });
    expect(res.body.inr.price).toBe(4_200_000);
    expect(res.body).toMatchObject({ source: "CoinGecko", stale: false });
    expect(res.body.fetchedAt).toBeTruthy();
  });
  it("caches and shares in-flight requests", async () => {
    const f = mockUpstream({ "/coins/bitcoin?": coingeckoCoin() });
    await Promise.all([request(app).get("/api/market/snapshot"), request(app).get("/api/market/snapshot")]);
    await request(app).get("/api/market/snapshot");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("maps provider rate limits to a clear 503", async () => {
    mockUpstream({ "/coins/bitcoin?": [429, {}] });
    const res = await request(app).get("/api/market/snapshot");
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("RATE_LIMITED");
  });
  it("network failure returns 503, not fake data", async () => {
    mockUpstream({});
    const res = await request(app).get("/api/market/fees");
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("UPSTREAM_UNAVAILABLE");
  });
  it("maps mempool fees", async () => {
    mockUpstream({ "/v1/fees/recommended": feesBody });
    const res = await request(app).get("/api/market/fees");
    expect(res.body).toMatchObject({ fastest: 20, economy: 5, unit: "sat/vB", source: "mempool.space" });
  });
  it("validates chart range", async () => {
    expect((await request(app).get("/api/market/chart?days=3")).status).toBe(400);
    mockUpstream({ market_chart: { prices: Array.from({ length: 500 }, (_, i) => [i, i]) } });
    const res = await request(app).get("/api/market/chart?days=7&currency=INR");
    expect(res.status).toBe(200);
    expect(res.body.points.length).toBeLessThanOrEqual(201);
    expect(res.body.currency).toBe("INR");
  });
  it("watchlist prices ignore unknown coin ids", async () => {
    mockUpstream({ "/simple/price": { bitcoin: { usd: 1, inr: 2, usd_24h_change: 0.5 } } });
    const res = await request(app).get("/api/market/watch?ids=bitcoin,notacoin");
    expect(res.body.items).toHaveLength(1);
  });
});

describe("explorer", () => {
  const tx = {
    txid: TXID, fee: 1410, weight: 561, size: 222,
    status: { confirmed: true, block_height: 800_000, block_time: 1_700_000_000, block_hash: "b".repeat(64) },
    vin: [{ txid: "c".repeat(64), vout: 0, prevout: { scriptpubkey_address: "bc1qin", value: 100_000 } }],
    vout: [{ scriptpubkey_address: "bc1qout", scriptpubkey_type: "v0_p2wpkh", value: 98_590 }],
  };
  it("rejects malformed txids before calling the provider", async () => {
    const f = mockUpstream({});
    const res = await request(app).get("/api/explorer/tx/not-a-txid");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/64-character/);
    expect(f).not.toHaveBeenCalled();
  });
  it("maps a confirmed transaction with confirmations and fee rate", async () => {
    mockUpstream({ "/blocks/tip/height": 800_009, [`/tx/${TXID}`]: tx });
    const res = await request(app).get(`/api/explorer/tx/${TXID}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ confirmed: true, confirmations: 10, feeSats: 1410, vsize: 141, feeRate: 10, inputCount: 1 });
    expect(res.body.sourceUrl).toBe(`https://mempool.space/tx/${TXID}`);
  });
  it("returns 404 for unknown transactions", async () => {
    mockUpstream({ "/tx/": [404, "Transaction not found"] });
    expect((await request(app).get(`/api/explorer/tx/${TXID}`)).status).toBe(404);
  });
  it("validates block queries", async () => {
    expect((await request(app).get("/api/explorer/block/xyz")).status).toBe(400);
  });
});

describe("risk simulator endpoint", () => {
  it("uses manual price and validates input", async () => {
    const ok = await request(app).post("/api/risk/simulate").set(H)
      .send({ priceUsd: 50_000, portfolios: [{ label: "Me", btc: 0.5, cashUsd: 1000 }], shocks: [-10] });
    expect(ok.status).toBe(200);
    expect(ok.body.priceSource).toBe("user input");
    const bad = await request(app).post("/api/risk/simulate").set(H).send({ portfolios: [], shocks: [-10] });
    expect(bad.status).toBe(400);
  });
});

describe("assistant without configuration", () => {
  it("reports not configured", async () => {
    const res = await request(app).get("/api/assistant/status");
    expect(res.body.configured).toBe(false);
  });
});
