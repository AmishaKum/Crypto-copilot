import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

  app.use("/api/health", healthRoutes);
  app.use("/api/market", marketRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
