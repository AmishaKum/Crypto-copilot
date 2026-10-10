import { z } from "zod";
import { WATCHABLE, CHART_DAYS } from "../services/marketService.js";
import { ALERT_KINDS } from "../models/Alert.js";

const email = z.string().trim().toLowerCase().email("must be a valid email").max(254);
const password = z.string().min(8, "must be at least 8 characters").max(128, "is too long");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "is required").max(60),
  email,
  password: password.refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "must include a letter and a number"),
});
export const loginSchema = z.object({ email, password: z.string().min(1, "is required").max(128) });

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  preferences: z.object({
    currency: z.enum(["USD", "INR"]).optional(),
    aiIncludePortfolio: z.boolean().optional(),
  }).strict().optional(),
}).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: registerSchema.shape.password });
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });
export const coinIdSchema = z.object({ id: z.enum(Object.keys(WATCHABLE)) });

export const chartQuerySchema = z.object({
  days: z.coerce.number().refine((d) => CHART_DAYS.includes(d), `must be one of ${CHART_DAYS.join(", ")}`).default(7),
  currency: z.enum(["USD", "INR"]).default("USD"),
});
export const watchQuerySchema = z.object({ ids: z.string().max(300).default("bitcoin") });

export const txParamSchema = z.object({ txid: z.string().regex(/^[0-9a-fA-F]{64}$/, "must be a 64-character hexadecimal transaction ID") });
export const blockParamSchema = z.object({
  query: z.string().refine((q) => /^\d{1,7}$/.test(q) || /^[0-9a-fA-F]{64}$/.test(q), "must be a block height or 64-character block hash"),
});

const positive = (max) => z.coerce.number().positive("must be greater than 0").max(max).finite();
export const tradeSchema = z.object({
  side: z.enum(["buy", "sell"]),
  btc: positive(1000).optional(),
  usd: positive(10_000_000).optional(),
}).strict().refine((t) => (t.btc != null) !== (t.usd != null), "Provide exactly one of btc or usd");
export const resetSchema = z.object({
  confirm: z.literal("RESET", { errorMap: () => ({ message: 'Type "RESET" to confirm' }) }),
  startingUsd: z.coerce.number().min(100).max(1_000_000).default(10_000),
});

export const riskSchema = z.object({
  priceUsd: positive(100_000_000).optional(),
  portfolios: z.array(z.object({
    label: z.string().trim().min(1).max(40),
    btc: z.coerce.number().min(0).max(10_000),
    cashUsd: z.coerce.number().min(0).max(100_000_000),
  })).min(1).max(2),
  shocks: z.array(z.coerce.number().min(-99).max(500)).min(1).max(12),
});

export const alertSchema = z.object({
  kind: z.enum(ALERT_KINDS),
  threshold: z.coerce.number().positive().max(1e12),
  currency: z.enum(["USD", "INR"]).default("USD"),
  enabled: z.boolean().default(true),
});
export const alertUpdateSchema = z.object({ enabled: z.boolean().optional(), threshold: z.coerce.number().positive().max(1e12).optional() }).strict();
export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-f]{24}$/, "invalid id") });

export const askSchema = z.object({
  message: z.string().trim().min(1, "is required").max(1000, "must be under 1000 characters"),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(8).default([]),
  includePortfolio: z.boolean().default(false),
});

export const quizSchema = z.object({ answers: z.array(z.number().int().min(0).max(10)).max(20) });
