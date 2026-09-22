/**
 * src/middlewares/apiKeyAuth.ts
 *
 * API Key authentication middleware.
 * Expects: Authorization: Bearer <API_KEY>
 * Or: X-API-Key: <API_KEY>
 */

import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import { env } from "../config/env";

export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Support both Authorization: Bearer <key> and X-API-Key: <key>
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

  let providedKey: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: "Missing API key. Use Authorization: Bearer <key> or X-API-Key header.",
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(env.API_KEY);
  const provided = Buffer.from(providedKey);

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    res.status(401).json({ success: false, error: "Invalid API key" });
    return;
  }

  next();
}
