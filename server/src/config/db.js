import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    console.warn("[db] MONGODB_URI not set - running without database");
    return false;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log("[db] MongoDB connected");
  return true;
}

export const dbStatus = () =>
  ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
