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
  // Email (SMTP). Without SMTP_HOST, emails are printed to the server console instead of sent.
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || "Crypto Copilot <no-reply@localhost>",
  // Public URL of the frontend, used in links inside emails.
  appUrl: (process.env.APP_URL || list(process.env.CLIENT_ORIGIN || "http://localhost:5173")[0]).replace(/\/$/, ""),
  tradeFeeBps: Number(process.env.TRADE_FEE_BPS ?? 10), // 10 bps = 0.10% simulated fee
};
