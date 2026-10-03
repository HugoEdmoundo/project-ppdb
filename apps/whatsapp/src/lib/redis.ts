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

function attachLogging(client: Redis, label: string): Redis {
  // Error SEBELUM koneksi pernah `ready` itu startup race, bukan kegagalan:
  // saat dockerd boot, `restart: unless-stopped` menyalakan semua container
  // paralel sehingga `depends_on: service_healthy` TIDAK berlaku, dan
  // koneksi BullMQ bisa mendarat sebelum redis listen (ECONNREFUSED /
  // ENOTFOUND). ioredis reconnect otomatis, jadi ini cukup `warn` — kalau
  // dilog `error` tiap boot, log jadi penuh noise palsu.
  // Setelah pernah ready, error berikutnya = koneksi putus sungguhan, baru `error`.
  let everReady = false;

  client.on("connect", () => logger.info(`Redis connected (${label})`));
  client.on("ready", () => {
    everReady = true;
    logger.info(`Redis ready (${label})`);
  });
  client.on("error", (err) => {
    const ctx = { error: err.message, everReady };
    if (everReady) {
      logger.error(`Redis error (${label})`, ctx);
    } else {
      logger.warn(`Redis belum siap (${label}), menunggu connect...`, ctx);
    }
  });
  client.on("close", () => logger.warn(`Redis connection closed (${label})`));
  client.on("reconnecting", () => logger.warn(`Redis reconnecting... (${label})`));
  return client;
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = attachLogging(new Redis(redisOptions), "singleton");
  }
  return _redis;
}

/**
 * Create a new Redis connection — required by BullMQ for each queue/worker.
 * BullMQ does NOT allow sharing connections between queue and worker instances.
 */
export function createRedisConnection(): Redis {
  // WAJIB attach handler `error` di sini juga: BullMQ (Queue/Worker/QueueEvents)
  // memakai instance ini langsung. Tanpa listener, ioredis melempar
  // "Unhandled error event" yang membuat proses Node crash setiap Redis
  // disconnect sesaat (mis. saat container redis restart).
  return attachLogging(new Redis(redisOptions), "bullmq");
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    logger.info("Redis connection closed gracefully");
  }
}
