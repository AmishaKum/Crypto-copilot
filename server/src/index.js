import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDB(env.mongoUri);
} catch (e) {
  console.error("[db] connection failed:", e.message);
}
createApp().listen(env.port, () => console.log(`[server] http://localhost:${env.port}`));
