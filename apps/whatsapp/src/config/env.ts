/**
 * src/config/env.ts
 *
 * Centralized environment variable validation using Zod.
 * Fails fast at startup if required variables are missing or invalid.
 */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  HOST: z.string().default("0.0.0.0"),

  // API Key — must be at least 32 chars in production
  API_KEY: z.string().min(32, "API_KEY must be at least 32 characters"),

  // MySQL
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("ptdarrahman"),

  // Redis
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().default(""),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(1),

  // Puppeteer / WhatsApp
  CHROMIUM_EXECUTABLE_PATH: z.string().optional(),
  WA_SESSION_PATH: z.string().default("./wa-session"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),

  // WA throttle
  WA_THROTTLE_PER_MINUTE: z.coerce.number().int().min(1).default(20),

  // Webhook
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().default(""),

  // Logging
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug"])
    .default("info"),
  LOG_FILE_PATH: z.string().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues ?? [];
    const formatted = issues
      .map((e) => {
        const path = e.path.map((p) => String(p)).join(".");
        return `  ${path}: ${e.message}`;
      })
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
