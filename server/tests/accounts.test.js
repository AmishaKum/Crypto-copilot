import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app, H, startDb, stopDb, clearDb, loginAgent, mockUpstream, coingeckoCoin, feesBody } from "./helpers.js";
import { env } from "../src/config/env.js";
import { evaluateAlerts } from "../src/services/alertService.js";
import { AlertEvent } from "../src/models/Alert.js";
import { LESSONS } from "../src/data/lessons.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("authentication", () => {
  it("registers, returns no password hash, and sets an HttpOnly cookie", async () => {
    const res = await request(app).post("/api/auth/register").set(H).send({ name: "Ann", email: "Ann@Example.com", password: "secret123" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ann@example.com");
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|secret123/);
    expect(res.headers["set-cookie"][0]).toMatch(/cc_token=.*HttpOnly/);
  });
  it("validates weak passwords and bad emails", async () => {
    const r1 = await request(app).post("/api/auth/register").set(H).send({ name: "A", email: "a@b.co", password: "short" });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post("/api/auth/register").set(H).send({ name: "A", email: "nope", password: "secret123" });
    expect(r2.status).toBe(400);
  });
  it("duplicate registration gives a generic error", async () => {
    await loginAgent("dup@test.dev");
    const res = await request(app).post("/api/auth/register").set(H).send({ name: "B", email: "dup@test.dev", password: "secret123" });
    expect(res.status).toBe(409);
    expect(res.body.error).not.toMatch(/already registered/i);
  });
  it("login errors are identical for unknown email and wrong password", async () => {
    await loginAgent("known@test.dev");
    const a = await request(app).post("/api/auth/login").set(H).send({ email: "known@test.dev", password: "wrongpass1" });
    const b = await request(app).post("/api/auth/login").set(H).send({ email: "ghost@test.dev", password: "wrongpass1" });
    expect(a.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });
  it("blocks NoSQL operator injection in login", async () => {
    const res = await request(app).post("/api/auth/login").set(H).send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
  });
  it("protects routes and supports logout + logout everywhere", async () => {
    expect((await request(app).get("/api/me")).status).toBe(401);
    const { agent } = await loginAgent("me@test.dev");
    expect((await agent.get("/api/me")).body.user.email).toBe("me@test.dev");
    // Second session for the same user
    const other = request.agent(app);
    await other.post("/api/auth/login").set(H).send({ email: "me@test.dev", password: "secret123" });
    await agent.post("/api/auth/logout-all").set(H);
    expect((await agent.get("/api/me")).status).toBe(401);
    expect((await other.get("/api/me")).status).toBe(401);
  });
  it("updates preferences and watchlist with validation", async () => {
    const { agent } = await loginAgent();
    const p = await agent.patch("/api/me").set(H).send({ preferences: { currency: "INR" } });
    expect(p.body.user.preferences.currency).toBe("INR");
    expect((await agent.patch("/api/me").set(H).send({ role: "admin" })).status).toBe(400);
    expect((await agent.post("/api/me/watchlist/ethereum").set(H)).body.watchlist).toContain("ethereum");
    expect((await agent.post("/api/me/watchlist/scamcoin").set(H)).status).toBe(400);
  });
  it("deletes account and all its data with password confirmation", async () => {
    const { agent } = await loginAgent("bye@test.dev");
    expect((await agent.delete("/api/me").set(H).send({ password: "wrong" })).status).toBe(401);
    expect((await agent.delete("/api/me").set(H).send({ password: "secret123" })).status).toBe(200);
    expect((await request(app).post("/api/auth/login").set(H).send({ email: "bye@test.dev", password: "secret123" })).status).toBe(401);
  });
});

describe("virtual portfolio", () => {
  beforeEach(() => { mockUpstream({ "/coins/bitcoin?": coingeckoCoin(50_000) }); });

  it("starts with $10,000 virtual cash", async () => {
    const { agent } = await loginAgent();
    const res = await agent.get("/api/portfolio");
    expect(res.body).toMatchObject({ cashCents: 1_000_000, btcSats: 0, equityCents: 1_000_000, priceSource: "CoinGecko" });
  });
  it("buys and sells at the server's live price with fees and realized P&L", async () => {
    const { agent } = await loginAgent();
    const buy = await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.1, priceCents: 1 });
    expect(buy.status).toBe(400); // client-supplied price is rejected (strict schema)
    const b = await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.1 });
    expect(b.status).toBe(201);
    expect(b.body.portfolio).toMatchObject({ cashCents: 1_000_000 - 500_500, btcSats: 10_000_000, costBasisCents: 500_500 });

    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(60_000) });
    const s = await agent.post("/api/portfolio/trades").set(H).send({ side: "sell", btc: 0.05 });
    // proceeds 300,000 - fee 300 = 299,700; basis removed 250,250 -> realized 49,450 cents
    expect(s.body.trade.realizedPnlCents).toBe(49_450);
    expect(s.body.portfolio.btcSats).toBe(5_000_000);

    const hist = await agent.get("/api/portfolio/trades");
    expect(hist.body.trades).toHaveLength(2);
    expect(hist.body.curve).toHaveLength(3); // opening balance + 2 trades
    expect(hist.body.curve[0].equityCents).toBe(1_000_000);
  });
  it("buys by USD amount", async () => {
    const { agent } = await loginAgent();
    const r = await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", usd: 500 });
    expect(r.body.portfolio.btcSats).toBe(1_000_000);
  });
  it("prevents overspending and overselling", async () => {
    const { agent } = await loginAgent();
    expect((await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 1 })).body.code).toBe("INSUFFICIENT_CASH");
    expect((await agent.post("/api/portfolio/trades").set(H).send({ side: "sell", btc: 0.01 })).body.code).toBe("INSUFFICIENT_BTC");
    expect((await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: -1 })).status).toBe(400);
  });
  it("concurrent buys never overspend", async () => {
    const { agent } = await loginAgent();
    const results = await Promise.all(Array.from({ length: 4 }, () => agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.07 })));
    const ok = results.filter((r) => r.status === 201).length;
    const p = await agent.get("/api/portfolio");
    expect(p.body.cashCents).toBeGreaterThanOrEqual(0);
    expect(p.body.btcSats).toBe(ok * 7_000_000);
  });
  it("pauses trading when price is unavailable", async () => {
    const { agent } = await loginAgent();
    mockUpstream({});
    const r = await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.01 });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("PRICE_UNAVAILABLE");
  });
  it("reset requires explicit confirmation", async () => {
    const { agent } = await loginAgent();
    await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.01 });
    expect((await agent.post("/api/portfolio/reset").set(H).send({})).status).toBe(400);
    const r = await agent.post("/api/portfolio/reset").set(H).send({ confirm: "RESET", startingUsd: 5000 });
    expect(r.body).toMatchObject({ cashCents: 500_000, btcSats: 0, tradeCount: 0 });
  });
  it("users can't see each other's portfolios", async () => {
    const a = await loginAgent();
    const b = await loginAgent();
    await a.agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.01 });
    expect((await b.agent.get("/api/portfolio")).body.btcSats).toBe(0);
    expect((await b.agent.get("/api/portfolio/trades")).body.trades).toHaveLength(0);
  });
});

describe("alerts", () => {
  it("fires once per crossing, re-arms, and is isolated per user", async () => {
    const { agent, user } = await loginAgent();
    const created = await agent.post("/api/alerts").set(H).send({ kind: "price_above", threshold: 55_000, currency: "USD" });
    expect(created.status).toBe(201);
    const id = created.body.alert._id;

    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(50_000), "/v1/fees": feesBody });
    expect((await evaluateAlerts()).triggered).toBe(0);
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(56_000), "/v1/fees": feesBody });
    expect((await evaluateAlerts()).triggered).toBe(1);
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(57_000), "/v1/fees": feesBody });
    expect((await evaluateAlerts()).triggered).toBe(0); // still above: no duplicate
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(50_000), "/v1/fees": feesBody });
    await evaluateAlerts(); // re-arm
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(56_000), "/v1/fees": feesBody });
    expect((await evaluateAlerts()).triggered).toBe(1);
    expect(await AlertEvent.countDocuments({ user: user.id })).toBe(2);

    const other = await loginAgent();
    expect((await other.agent.patch(`/api/alerts/${id}`).set(H).send({ enabled: false })).status).toBe(404);
    expect((await other.agent.delete(`/api/alerts/${id}`).set(H)).status).toBe(404);
    expect((await other.agent.get("/api/alerts")).body.alerts).toHaveLength(0);
    expect((await agent.get("/api/alerts")).body.events).toHaveLength(2);
  });
  it("fee alerts use the next-block fee and skip stale/missing data", async () => {
    const { agent } = await loginAgent();
    await agent.post("/api/alerts").set(H).send({ kind: "fee_below", threshold: 25 });
    mockUpstream({});
    expect((await evaluateAlerts()).triggered).toBe(0);
    mockUpstream({ "/v1/fees": feesBody });
    expect((await agent.post("/api/alerts/check").set(H)).body.triggered).toBe(1);
  });
});

describe("academy", () => {
  it("lists lessons without answers and records progress", async () => {
    const list = await request(app).get("/api/academy/lessons");
    expect(list.body.lessons.length).toBe(LESSONS.length);
    const one = await request(app).get(`/api/academy/lessons/${LESSONS[0].id}`);
    expect(JSON.stringify(one.body)).not.toMatch(/"answer"/);

    const { agent } = await loginAgent();
    const answers = LESSONS[0].quiz.map((q) => q.answer);
    const r = await agent.post(`/api/academy/lessons/${LESSONS[0].id}/submit`).set(H).send({ answers });
    expect(r.body).toMatchObject({ score: 100, passed: true, progress: { completed: true } });
    const mine = await agent.get("/api/academy/lessons");
    expect(mine.body.lessons[0].progress.completed).toBe(true);
    expect((await agent.post(`/api/academy/lessons/${LESSONS[0].id}/submit`).set(H).send({ answers: [0] })).status).toBe(400);
  });
});

describe("admin", () => {
  it("only admins (ADMIN_EMAILS) can read aggregate stats", async () => {
    const { agent } = await loginAgent();
    expect((await agent.get("/api/admin/stats")).status).toBe(403);
    env.adminEmails = ["boss@test.dev"];
    const admin = await loginAgent("boss@test.dev");
    const res = await admin.agent.get("/api/admin/stats");
    env.adminEmails = [];
    expect(res.status).toBe(200);
    expect(res.body.users).toBe(2);
    expect(JSON.stringify(res.body)).not.toMatch(/@/);
  });
});

describe("AI assistant", () => {
  it("returns a configuration error when no key is set", async () => {
    const { agent } = await loginAgent();
    const r = await agent.post("/api/assistant/chat").set(H).send({ message: "What is a satoshi?" });
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("AI_NOT_CONFIGURED");
  });
  it("sends real data with sources, blocks secrets, handles quota errors", async () => {
    Object.assign(env, { aiApiKey: "test-key", aiProvider: "gemini" });
    try {
      const { agent } = await loginAgent();
      let sentBody;
      mockUpstream({
        "/coins/bitcoin?": coingeckoCoin(50_000),
        "/v1/fees": feesBody,
        generativelanguage: (url, init) => {
          sentBody = JSON.parse(init.body);
          return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "**What the data shows** ..." }] } }] }) };
        },
      });
      const r = await agent.post("/api/assistant/chat").set(H).send({ message: "Why did BTC move today?", includePortfolio: true });
      expect(r.status).toBe(200);
      expect(r.body.answer).toMatch(/What the data shows/);
      expect(r.body.dataQuality).toBe("high");
      expect(r.body.evidence.some((e) => e.source === "CoinGecko")).toBe(true);
      const prompt = JSON.stringify(sentBody);
      expect(prompt).toMatch(/50000/);
      expect(prompt).not.toMatch(/@test\.dev/); // no PII sent to the provider

      const secret = await agent.post("/api/assistant/chat").set(H)
        .send({ message: "abandon ability able about above absent absorb abstract absurd abuse access accident" });
      expect(secret.body.code).toBe("SECRET_DETECTED");

      mockUpstream({ generativelanguage: [429, {}] });
      const q = await agent.post("/api/assistant/chat").set(H).send({ message: "What is a block?" });
      expect(q.status).toBe(503);
      expect(q.body.code).toBe("AI_QUOTA");
    } finally {
      env.aiApiKey = "";
    }
  });
});
