import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app, H, startDb, stopDb, clearDb, loginAgent, mockUpstream, coingeckoCoin, feesBody } from "./helpers.js";
import { lastEmails, clearOutbox } from "../src/services/emailService.js";
import { evaluateAlerts } from "../src/services/alertService.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await clearDb(); clearOutbox(); });

const tokenFrom = (email) => email.text.match(/token=([0-9a-f]{64})/)[1];

describe("forgot / reset password", () => {
  it("emails a single-use reset link and changes the password", async () => {
    await loginAgent("reset@test.dev");
    const r = await request(app).post("/api/auth/forgot-password").set(H).send({ email: "reset@test.dev" });
    expect(r.status).toBe(200);
    const mail = lastEmails().at(-1);
    expect(mail.to).toBe("reset@test.dev");
    expect(mail.text).toMatch(/\/reset-password\?token=/);
    const token = tokenFrom(mail);

    const weak = await request(app).post("/api/auth/reset-password").set(H).send({ token, password: "short" });
    expect(weak.status).toBe(400);
    const ok = await request(app).post("/api/auth/reset-password").set(H).send({ token, password: "newpass123" });
    expect(ok.status).toBe(200);

    expect((await request(app).post("/api/auth/login").set(H).send({ email: "reset@test.dev", password: "secret123" })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").set(H).send({ email: "reset@test.dev", password: "newpass123" })).status).toBe(200);
    // single use
    const again = await request(app).post("/api/auth/reset-password").set(H).send({ token, password: "another123" });
    expect(again.body.code).toBe("RESET_INVALID");
  });

  it("gives the same answer for unknown emails and sends nothing", async () => {
    await loginAgent("known@test.dev");
    clearOutbox();
    const a = await request(app).post("/api/auth/forgot-password").set(H).send({ email: "known@test.dev" });
    const b = await request(app).post("/api/auth/forgot-password").set(H).send({ email: "nobody@test.dev" });
    expect(a.body).toEqual(b.body);
    expect(lastEmails()).toHaveLength(1);
  });

  it("logs out existing sessions after a reset and rejects bad tokens", async () => {
    const { agent } = await loginAgent("sess@test.dev");
    await request(app).post("/api/auth/forgot-password").set(H).send({ email: "sess@test.dev" });
    await request(app).post("/api/auth/reset-password").set(H).send({ token: tokenFrom(lastEmails().at(-1)), password: "newpass123" });
    expect((await agent.get("/api/me")).status).toBe(401);
    expect((await request(app).post("/api/auth/reset-password").set(H).send({ token: "a".repeat(64), password: "newpass123" })).body.code).toBe("RESET_INVALID");
    expect((await request(app).post("/api/auth/reset-password").set(H).send({ token: "not-hex", password: "newpass123" })).status).toBe(400);
  });

  it("expired tokens are rejected", async () => {
    await loginAgent("exp@test.dev");
    await request(app).post("/api/auth/forgot-password").set(H).send({ email: "exp@test.dev" });
    const token = tokenFrom(lastEmails().at(-1));
    const User = (await import("../src/models/User.js")).default;
    await User.updateOne({ email: "exp@test.dev" }, { $set: { resetTokenExpires: new Date(Date.now() - 1000) } });
    expect((await request(app).post("/api/auth/reset-password").set(H).send({ token, password: "newpass123" })).body.code).toBe("RESET_INVALID");
  });
});

describe("email alerts", () => {
  it("emails only users who opted in, once per crossing", async () => {
    const on = await loginAgent("on@test.dev");
    const off = await loginAgent("off@test.dev");
    await on.agent.patch("/api/me").set(H).send({ preferences: { emailAlerts: true } });
    for (const u of [on, off]) await u.agent.post("/api/alerts").set(H).send({ kind: "price_above", threshold: 55_000 });
    clearOutbox();
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(60_000), "/v1/fees": feesBody });
    await evaluateAlerts();
    await evaluateAlerts(); // still above: no second email
    const mails = lastEmails();
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("on@test.dev");
    expect(mails[0].subject).toMatch(/BTC price rose to or above \$55,000/);
    expect(mails[0].text).toMatch(/\$60,000/);
  });

  it("test email endpoint reports console mode when SMTP is not set", async () => {
    const { agent } = await loginAgent("t@test.dev");
    const r = await agent.post("/api/me/test-email").set(H);
    expect(r.body.mode).toBe("console");
    expect(lastEmails().at(-1).to).toBe("t@test.dev");
    expect((await agent.get("/api/me/email-status")).body.configured).toBe(false);
  });
});

describe("network status and CSV export", () => {
  it("returns halving countdown and mempool backlog", async () => {
    mockUpstream({ "/blocks/tip/height": 900_000, "/api/mempool": { count: 12345, vsize: 9_000_000, total_fee: 50_000_000 } });
    const r = await request(app).get("/api/market/network");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ height: 900_000, nextHalvingHeight: 1_050_000, blocksLeft: 150_000, mempool: { txCount: 12345 } });
  });

  it("exports the user's trades as CSV", async () => {
    mockUpstream({ "/coins/bitcoin?": coingeckoCoin(50_000) });
    const { agent } = await loginAgent();
    await agent.post("/api/portfolio/trades").set(H).send({ side: "buy", btc: 0.01 });
    const r = await agent.get("/api/portfolio/trades.csv");
    expect(r.headers["content-type"]).toMatch(/text\/csv/);
    const lines = r.text.trim().split("\n");
    expect(lines[0]).toMatch(/^"date","side","btc"/);
    expect(lines[1]).toMatch(/"buy","0.01000000","50000.00","500.00","0.50"/);
    expect((await request(app).get("/api/portfolio/trades.csv")).status).toBe(401);
  });
});
