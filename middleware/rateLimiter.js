import rateLimit from "express-rate-limit";

// Rate limiter for Auth endpoints (Login & Register: max 20 requests per 15 mins)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Rate Limiter (max 100 requests per 15 mins)
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
});