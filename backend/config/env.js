import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  apiKeyHeader: "x-api-key",
  appApiKey: process.env.APP_API_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || "1m",
  },
};
