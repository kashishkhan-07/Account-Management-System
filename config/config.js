import dotenv from "dotenv";
dotenv.config();

// Check Mongo URI
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

// Check Access Token JWT Secret
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Check Refresh Token JWT Secret
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
}

const config = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};

export default config;