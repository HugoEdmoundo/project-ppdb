/**
 * src/lib/logger.ts
 *
 * Centralized Winston logger.
 * - Pretty-prints in development
 * - JSON structured logs in production
 * - Optional file transport
 */

import path from "path";
import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${service ?? "wa"}] ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  }),
];

if (env.LOG_FILE_PATH) {
  transports.push(
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, "error.log"),
      level: "error",
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, "combined.log"),
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: "whatsapp-service" },
  transports,
  exitOnError: false,
});

export function childLogger(meta: Record<string, unknown>): winston.Logger {
  return logger.child(meta);
}
