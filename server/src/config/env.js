const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
const nodeEnv = process.env.NODE_ENV || "development";

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProd: nodeEnv === "production",
  clientOrigins: list(process.env.CLIENT_ORIGIN || "http://localhost:5173"),
  mongoUri: process.env.MONGODB_URI || "",
  // A fixed fallback is only acceptable outside production; index.js refuses to start without one in prod.
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === "production" ? "" : "dev-only-insecure-jwt-secret"),
  jwtTtlDays: 7,
  cookieSameSite: process.env.COOKIE_SAMESITE || "lax",
  adminEmails: list(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  coingeckoApiKey: process.env.COINGECKO_API_KEY || "",
  aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase(),
  aiApiKey: process.env.AI_API_KEY || "",
  aiModel: process.env.AI_MODEL || "",
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT) || 200,
  alertsIntervalMs: Number(process.env.ALERTS_INTERVAL_MS) || 120_000,
  tradeFeeBps: Number(process.env.TRADE_FEE_BPS ?? 10), // 10 bps = 0.10% simulated fee
};
