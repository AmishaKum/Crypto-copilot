export const env = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "",
  nodeEnv: process.env.NODE_ENV || "development",
};
