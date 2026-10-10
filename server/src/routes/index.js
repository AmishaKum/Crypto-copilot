import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth, optionalAuth, requireAdmin, requireDb } from "../middleware/auth.js";
import { authLimiter, aiLimiter } from "../middleware/rateLimits.js";
import * as s from "../validation/schemas.js";
import * as auth from "../controllers/authController.js";
import * as users from "../controllers/userController.js";
import * as market from "../controllers/marketController.js";
import * as explorer from "../controllers/explorerController.js";
import * as portfolio from "../controllers/portfolioController.js";
import * as risk from "../controllers/riskController.js";
import * as alerts from "../controllers/alertController.js";
import * as assistant from "../controllers/assistantController.js";
import * as academy from "../controllers/academyController.js";
import * as admin from "../controllers/adminController.js";

const r = Router();
const authed = [requireDb, requireAuth];

// Public market + explorer data (no database needed)
r.get("/market/snapshot", market.snapshot);
r.get("/market/price", market.snapshot); // backwards compatible alias
r.get("/market/fees", market.fees);
r.get("/market/chart", validate(s.chartQuerySchema, "query"), market.chart);
r.get("/market/watch", validate(s.watchQuerySchema, "query"), market.watch);
r.get("/market/coins", market.coins);
r.get("/explorer/tx/:txid", validate(s.txParamSchema, "params"), explorer.tx);
r.get("/explorer/block/:query", validate(s.blockParamSchema, "params"), explorer.block);
r.get("/explorer/blocks", explorer.recentBlocks);
r.post("/risk/simulate", validate(s.riskSchema), risk.simulate);
r.get("/assistant/status", assistant.status);

// Auth
r.post("/auth/register", requireDb, authLimiter, validate(s.registerSchema), auth.register);
r.post("/auth/login", requireDb, authLimiter, validate(s.loginSchema), auth.login);
r.post("/auth/logout", auth.logout);
r.post("/auth/logout-all", ...authed, auth.logoutAll);

// Current user
r.get("/me", ...authed, users.me);
r.patch("/me", ...authed, validate(s.updateMeSchema), users.updateMe);
r.post("/me/password", ...authed, authLimiter, validate(s.changePasswordSchema), users.changePassword);
r.post("/me/watchlist/:id", ...authed, validate(s.coinIdSchema, "params"), users.addWatch);
r.delete("/me/watchlist/:id", ...authed, validate(s.coinIdSchema, "params"), users.removeWatch);
r.get("/me/export", ...authed, users.exportData);
r.delete("/me", ...authed, authLimiter, validate(s.deleteAccountSchema), users.deleteAccount);

// Virtual portfolio (simulation only)
r.get("/portfolio", ...authed, portfolio.get);
r.post("/portfolio/trades", ...authed, validate(s.tradeSchema), portfolio.trade);
r.get("/portfolio/trades", ...authed, portfolio.history);
r.post("/portfolio/reset", ...authed, validate(s.resetSchema), portfolio.reset);

// Alerts
r.get("/alerts", ...authed, alerts.list);
r.post("/alerts", ...authed, validate(s.alertSchema), alerts.create);
r.patch("/alerts/:id", ...authed, validate(s.idParamSchema, "params"), validate(s.alertUpdateSchema), alerts.update);
r.delete("/alerts/:id", ...authed, validate(s.idParamSchema, "params"), alerts.remove);
r.post("/alerts/check", ...authed, alerts.checkNow);
r.post("/alerts/events/read", ...authed, alerts.markRead);

// AI assistant
r.post("/assistant/chat", ...authed, aiLimiter, validate(s.askSchema), assistant.chat);

// Academy (lessons are public; progress needs an account)
r.get("/academy/lessons", optionalAuth, academy.list);
r.get("/academy/lessons/:id", academy.get);
r.post("/academy/lessons/:id/submit", ...authed, validate(s.quizSchema), academy.submit);

// Admin (aggregate stats only)
r.get("/admin/stats", ...authed, requireAdmin, admin.stats);

export default r;
