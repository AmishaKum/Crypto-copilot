import mongoose from "mongoose";

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true); // blocks $-operator injection via query filters

export async function connectDB(uri) {
  if (!uri) {
    console.warn("[db] MONGODB_URI not set - running without database (account features disabled)");
    return false;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log("[db] MongoDB connected");
  return true;
}

export const dbStatus = () =>
  ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
