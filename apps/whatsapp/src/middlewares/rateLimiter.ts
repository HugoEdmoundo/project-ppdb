/**
 * src/middlewares/rateLimiter.ts
 *
 * IP-based rate limiting using express-rate-limit.
 * Separate limits for general API and send endpoint.
 */

import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * General API rate limiter.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
  skip: (req) => req.path === "/health",
});

/**
 * Stricter rate limiter for the send endpoint.
 * Prevents API abuse for bulk sending.
 */
export const sendRateLimiter = rateLimit({
  windowMs: 60_000,   // 1 minute
  max: 50,            // Max 50 send requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Send rate limit exceeded. Max 50 requests/minute.",
  },
});

/**
 * Rate limiter for SSE connections.
 */
export const sseRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many SSE connections from this IP.",
  },
});
