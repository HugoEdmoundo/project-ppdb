/**
 * src/app.ts
 *
 * Express application factory.
 * Separated from server.ts untuk memudahkan testing.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { requestLogger } from "./middlewares/requestLogger";
import { apiRateLimiter } from "./middlewares/rateLimiter";
import { apiKeyAuth } from "./middlewares/apiKeyAuth";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

import healthRouter from "./routes/health.routes";
import sessionRouter from "./routes/session.routes";
import messageRouter from "./routes/message.routes";
import templateRouter from "./routes/template.routes";

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  // Only allow requests from the FastAPI backend (internal service)
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow no-origin (curl, internal requests) and localhost patterns
        if (!origin) return cb(null, true);
        const allowed =
          /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/.test(origin) ||
          /\.ptdarrahman\.sch\.id$/.test(origin);
        cb(allowed ? null : new Error("Not allowed by CORS"), allowed);
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    })
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // ── Request logging ───────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Rate limiting (global) ────────────────────────────────────────────────
  app.use(apiRateLimiter);

  // ── Public routes (no auth) ───────────────────────────────────────────────
  app.use("/health", healthRouter);

  // ── Protected routes (API Key required) ──────────────────────────────────
  app.use("/api", apiKeyAuth);
  app.use("/api/session", sessionRouter);
  app.use("/api/messages", messageRouter);
  app.use("/api/templates", templateRouter);

  // ── 404 & Error handlers (must be last) ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
