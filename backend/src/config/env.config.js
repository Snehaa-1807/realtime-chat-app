const { getEnv } = require("../utils/get-env");

const Env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", "8000"),
  MONGO_URI: getEnv("MONGO_URI"),          // required — no default
  JWT_SECRET: getEnv("JWT_SECRET", "secret_jwt"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "7d"),
  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),

  // Cloudinary — optional, only needed for image uploads
  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME", ""),
  CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY", ""),
  CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET", ""),

  // DeepSeek AI via NVIDIA — optional, only needed for AI chat
  GEMINI_API_KEY: getEnv("GEMINI_API_KEY", ""),
  AI_BOT_USER_ID: getEnv("AI_BOT_USER_ID", ""),
};

module.exports = { Env };