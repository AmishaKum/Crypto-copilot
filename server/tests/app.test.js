import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { clearCache } from "../src/services/cache.js";

const app = createApp();

function mockFetch(body, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
}

beforeEach(() => clearCache());

describe("API", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("sets security headers and hides x-powered-by", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("GET /api/market/price maps CoinGecko data (USD + INR)", async () => {
    mockFetch({ bitcoin: { usd: 60000, inr: 5000000, usd_24h_change: 1.5, inr_24h_change: 1.4, last_updated_at: 1700000000 } });
    const res = await request(app).get("/api/market/price");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ usd: 60000, inr: 5000000, source: "CoinGecko" });
  });

  it("caches price so upstream is called once", async () => {
    mockFetch({ bitcoin: { usd: 1, inr: 1, usd_24h_change: 0, inr_24h_change: 0, last_updated_at: 1 } });
    await request(app).get("/api/market/price");
    await request(app).get("/api/market/price");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when upstream fails", async () => {
    mockFetch({}, false, 429);
    const res = await request(app).get("/api/market/fees");
    expect(res.status).toBe(502);
  });

  it("GET /api/market/fees maps mempool data", async () => {
    mockFetch({ fastestFee: 20, halfHourFee: 15, hourFee: 10, economyFee: 5, minimumFee: 1 });
    const res = await request(app).get("/api/market/fees");
    expect(res.body).toMatchObject({ fastest: 20, economy: 5, unit: "sat/vB" });
  });

  it("unknown route returns 404 JSON", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
});

describe("network failures", () => {
  it("maps fetch rejection to 502", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const res = await request(app).get("/api/market/price");
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Could not reach/);
  });
});
