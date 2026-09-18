/**
 * src/middlewares/errorHandler.ts
 *
 * Global Express error handler.
 * - Formats all unhandled errors as JSON
 * - Hides internal details in production
 * - Logs to Winston
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues ?? [];
    const message = issues
      .map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
      .join("; ");
    res.status(422).json({ success: false, error: message || "Validation error" });
    return;
  }

  // Known operational errors (4xx)
  const status = (err as Error & { status?: number }).status ?? 500;

  if (status < 500) {
    res.status(status).json({ success: false, error: err.message });
    return;
  }

  // Server errors — log full details
  logger.error("[ErrorHandler] Unhandled error", {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};

/**
 * 404 handler — must be registered AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
