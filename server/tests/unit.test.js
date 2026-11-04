import { describe, it, expect } from "vitest";
import { notionalCents, feeCents, btcToSats } from "../src/utils/money.js";
import { computeTrade } from "../src/services/portfolioService.js";
import { simulateRisk } from "../src/services/riskService.js";
import { isConditionMet } from "../src/services/alertService.js";
import { looksLikeSecret } from "../src/services/ai/assistantService.js";
import { LESSONS, scoreQuiz } from "../src/data/lessons.js";

describe("money", () => {
  it("computes notional in integer cents without float drift", () => {
    expect(notionalCents(btcToSats(0.1), 5_000_000)).toBe(500_000); // 0.1 BTC @ $50,000 = $5,000
    expect(notionalCents(1, 5_000_000)).toBe(0); // 1 sat ≈ $0.0005 rounds to 0 cents
    expect(notionalCents(2_100_000_000_000_000, 10_000_000_000)).toBeGreaterThan(0); // no overflow
    expect(btcToSats(0.1 + 0.2)).toBe(30_000_000);
  });
  it("rounds fees half-up", () => expect(feeCents(500_000, 10)).toBe(500));
});

describe("computeTrade", () => {
  const state = { cashCents: 1_000_000, units: 0, costBasisCents: 0 };
  const BTC50K = 50_000_000_000; // $50,000 in micro-dollars
  it("buy deducts notional + fee and adds cost basis", () => {
    const t = computeTrade(state, { side: "buy", units: 10_000_000, priceMicros: BTC50K, feeBps: 10 });
    expect(t).toMatchObject({ notional: 500_000, fee: 500, cashDelta: -500_500, basisDelta: 500_500, realized: 0 });
  });
  it("rejects spending more cash than available", () => {
    expect(() => computeTrade(state, { side: "buy", units: 100_000_000, priceMicros: BTC50K, feeBps: 10 })).toThrow(/Not enough virtual cash/);
  });
  it("rejects selling more than held, naming the coin", () => {
    expect(() => computeTrade(state, { side: "sell", units: 1_000_000, priceMicros: 2_500_000_000, feeBps: 0, symbol: "ETH" })).toThrow(/more ETH than you hold/);
  });
  it("rejects trades under $1", () => {
    expect(() => computeTrade(state, { side: "buy", units: 1_000, priceMicros: BTC50K, feeBps: 0 })).toThrow(/Minimum trade value is \$1/);
  });
  it("sell uses average cost for realized P&L", () => {
    const held = { cashCents: 0, units: 20_000_000, costBasisCents: 1_000_000 }; // 0.2 BTC cost $10,000
    const t = computeTrade(held, { side: "sell", units: 10_000_000, priceMicros: 60_000_000_000, feeBps: 0 }); // sell half @ $60k
    expect(t).toMatchObject({ notional: 600_000, basisDelta: -500_000, realized: 100_000 });
  });
  it("prices low-value coins exactly (DOGE at $0.1234)", () => {
    const t = computeTrade(state, { side: "buy", units: 1_000 * 100_000_000, priceMicros: 123_400, feeBps: 0 }); // 1,000 DOGE
    expect(t.notional).toBe(12_340); // $123.40, not $120 from rounding the price to cents
  });
});

describe("risk simulator", () => {
  it("applies shocks to BTC only", () => {
    const r = simulateRisk({ priceUsd: 50_000, portfolios: [{ label: "A", btc: 1, cashUsd: 50_000 }], shocks: [-20, 10] });
    const a = r.results[0];
    expect(a.equityCents).toBe(10_000_000);
    expect(a.btcSharePct).toBe(50);
    expect(a.scenarios[0]).toMatchObject({ shockPct: -20, changeCents: -1_000_000, changePct: -10 });
    expect(a.scenarios[1]).toMatchObject({ changePct: 5 });
  });
  it("cash-only portfolio is unaffected", () => {
    const r = simulateRisk({ priceUsd: 50_000, portfolios: [{ label: "Cash", btc: 0, cashUsd: 1000 }], shocks: [-30] });
    expect(r.results[0].scenarios[0].changeCents).toBe(0);
  });
});

describe("alert conditions", () => {
  it("above/below thresholds", () => {
    expect(isConditionMet("price_above", 100, 100)).toBe(true);
    expect(isConditionMet("price_above", 100, 99)).toBe(false);
    expect(isConditionMet("fee_below", 5, 4)).toBe(true);
    expect(isConditionMet("fee_below", 5, null)).toBe(null);
  });
});

describe("secret detection", () => {
  it("flags seed-phrase-like input and WIF keys", () => {
    expect(looksLikeSecret("abandon ability able about above absent absorb abstract absurd abuse access accident")).toBe(true);
    expect(looksLikeSecret("5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ")).toBe(true);
  });
  it("does not flag normal questions", () => {
    expect(looksLikeSecret("what is the best way to buy bitcoin in india for a beginner")).toBe(false);
    expect(looksLikeSecret("why are fees high today")).toBe(false);
  });
});

describe("quiz scoring", () => {
  it("scores and applies pass mark", () => {
    const lesson = LESSONS[0];
    const all = scoreQuiz(lesson, lesson.quiz.map((q) => q.answer));
    expect(all).toMatchObject({ score: 100, passed: true });
    expect(scoreQuiz(lesson, lesson.quiz.map(() => 9)).passed).toBe(false);
  });
});

describe("gemini model selection", async () => {
  const { pickGeminiModel } = await import("../src/services/ai/providers.js");
  const m = (name, methods = ["generateContent"]) => ({ name: `models/${name}`, supportedGenerationMethods: methods });
  it("picks the newest stable flash text model", () => {
    expect(pickGeminiModel([m("gemini-2.5-flash"), m("gemini-3.8-flash"), m("gemini-3.8-flash-lite"), m("gemini-3.9-flash-preview"), m("gemini-3.8-pro")]))
      .toBe("gemini-3.9-flash-preview"); // newer version wins even if preview
    expect(pickGeminiModel([m("gemini-3.8-flash"), m("gemini-3.8-flash-preview"), m("text-embedding-004", ["embedContent"])])).toBe("gemini-3.8-flash");
    expect(pickGeminiModel([m("gemini-3.8-pro")])).toBe(null);
  });
});

describe("halving maths", async () => {
  const { halvingInfo } = await import("../src/services/marketService.js");
  it("computes the next halving and rewards", () => {
    const h = halvingInfo(840_000, 0);
    expect(h).toMatchObject({ nextHalvingHeight: 1_050_000, blocksLeft: 210_000, blockRewardBtc: 3.125, nextBlockRewardBtc: 1.5625, progressPct: 0 });
    expect(halvingInfo(1_049_999, 0).blocksLeft).toBe(1);
    expect(new Date(halvingInfo(1_049_994, 0).estimatedDate).getTime()).toBe(6 * 600_000);
  });
});
