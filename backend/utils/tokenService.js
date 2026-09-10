import jwt from "jsonwebtoken";
import config from "../config.js";

// Generate short-lived Access Token (15m)
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

// Generate long-lived Refresh Token (7d)
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
};

// Verify Access Token
export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

// Verify Refresh Token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
};