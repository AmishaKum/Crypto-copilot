import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { startAlertScheduler } from "./services/alertService.js";
import { aiStatus } from "./services/ai/assistantService.js";

if (env.isProd && (!env.jwtSecret || env.jwtSecret.length < 32)) {
  console.error("[config] JWT_SECRET must be set (32+ characters) in production. Refusing to start.");
  process.exit(1);
}

let dbReady = false;
try {
  dbReady = await connectDB(env.mongoUri);
} catch (e) {
  // Log only the message: the driver error never contains the password, but the URI is never printed.
  console.error("[db] connection failed:", e.message);
}
if (dbReady) startAlertScheduler(env.alertsIntervalMs);
const ai = aiStatus();
console.log(ai.configured ? `[ai] ${ai.provider} (${ai.model})` : "[ai] not configured - assistant disabled");

createApp().listen(env.port, () => console.log(`[server] http://localhost:${env.port}`));
