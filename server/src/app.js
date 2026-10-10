import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import healthRoutes from "./routes/healthRoutes.js";
import apiRoutes from "./routes/index.js";
import { apiLimiter } from "./middleware/rateLimits.js";
import { requireCsrfHeader } from "./middleware/csrf.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // correct client IPs behind Render/Vercel proxies for rate limiting
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use("/api", apiLimiter, requireCsrfHeader);

  app.use("/api/health", healthRoutes);
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
