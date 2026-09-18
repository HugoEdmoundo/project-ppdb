/**
 * src/middlewares/requestLogger.ts
 *
 * HTTP request logging via morgan → piped to Winston.
 */

import morgan, { type StreamOptions } from "morgan";
import { IncomingMessage, ServerResponse } from "http";
import { env } from "../config/env";
import { logger } from "../lib/logger";

// Morgan write stream → Winston
const stream: StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim(), { service: "http" });
  },
};

// Skip health checks from logs to reduce noise
const skip = (req: IncomingMessage, _res: ServerResponse) => {
  return (req as IncomingMessage & { path?: string }).url === "/health";
};

export const requestLogger = morgan(
  env.NODE_ENV === "production" ? "combined" : "dev",
  { stream, skip }
);
