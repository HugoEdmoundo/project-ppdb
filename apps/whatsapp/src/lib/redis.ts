/**
 * src/lib/redis.ts
 *
 * Singleton Redis client (ioredis) shared across BullMQ queues & workers.
 * BullMQ requires a dedicated connection per queue/worker/scheduler —
 * helper `createRedisConnection()` creates a fresh connection with the same config.
 */

import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

const redisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
} as const;

// Singleton for general usage (health checks, etc.)
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(redisOptions);
    _redis.on("connect", () => logger.info("Redis connected"));
    _redis.on("ready", () => logger.info("Redis ready"));
    _redis.on("error", (err) => logger.error("Redis error", { error: err.message }));
    _redis.on("close", () => logger.warn("Redis connection closed"));
    _redis.on("reconnecting", () => logger.warn("Redis reconnecting..."));
  }
  return _redis;
}

/**
 * Create a new Redis connection — required by BullMQ for each queue/worker.
 * BullMQ does NOT allow sharing connections between queue and worker instances.
 */
export function createRedisConnection(): Redis {
  return new Redis(redisOptions);
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    logger.info("Redis connection closed gracefully");
  }
}
