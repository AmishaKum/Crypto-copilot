import { vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { clearCache } from "../src/services/cache.js";

export const app = createApp();
export const H = { "X-Requested-With": "CryptoCopilot" };

let mongod;
export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}
export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export const coingeckoCoin = (usd = 50_000, inr = 4_200_000) => ({
  last_updated: "2026-10-10T12:00:00.000Z",
  market_data: {
    current_price: { usd, inr }, high_24h: { usd: usd * 1.02, inr }, low_24h: { usd: usd * 0.97, inr },
    market_cap: { usd: 1e12, inr: 8e13 }, total_volume: { usd: 3e10, inr: 2.5e12 },
    price_change_percentage_24h_in_currency: { usd: 1.5, inr: 1.4 }, last_updated: "2026-10-10T12:00:00.000Z",
  },
});
export const feesBody = { fastestFee: 20, halfHourFee: 15, hourFee: 10, economyFee: 5, minimumFee: 1 };

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => String(body) });

/** Routes mocked fetch calls by URL substring. Values: body, or [status, body], or a function(url, init). */
export function mockUpstream(routes) {
  clearCache();
  globalThis.fetch = vi.fn(async (url, init) => {
    const key = Object.keys(routes).find((k) => String(url).includes(k));
    if (!key) { if (process.env.DEBUG_FETCH) console.log("unmocked", String(url)); throw new TypeError("fetch failed"); }
    const v = routes[key];
    if (typeof v === "function") return v(url, init);
    return Array.isArray(v) ? json(v[1], v[0]) : json(v);
  });
  return globalThis.fetch;
}

/** Registers a user and returns a supertest agent holding its auth cookie. */
export async function loginAgent(email = `u${Math.random().toString(36).slice(2)}@test.dev`) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").set(H).send({ name: "Test", email, password: "secret123" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user };
}
