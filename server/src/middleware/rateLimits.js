import rateLimit from "express-rate-limit";

const base = { standardHeaders: "draft-7", legacyHeaders: false };

export const apiLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 300 });

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please wait 15 minutes and try again.", code: "RATE_LIMITED" },
});

// Separate counters so password-reset requests and test emails don't use up each other's limit.
const emailLimit = () => rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 5,
  message: { error: "Too many email requests. Please wait an hour and try again.", code: "RATE_LIMITED" },
});
export const forgotLimiter = emailLimit();
export const testEmailLimiter = emailLimit();

export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 20,
  keyGenerator: (req) => String(req.user?._id),
  message: { error: "AI limit reached (20 questions per hour). Please try again later.", code: "RATE_LIMITED" },
});
