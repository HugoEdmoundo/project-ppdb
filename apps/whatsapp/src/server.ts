/**
 * src/server.ts
 *
 * Application entrypoint.
 * - Starts Express HTTP server
 * - Initializes WhatsApp session
 * - Starts BullMQ worker
 * - Handles graceful shutdown (SIGTERM/SIGINT)
 */

import { env } from "./config/env";
import { logger } from "./lib/logger";
import { getRedis, closeRedis } from "./lib/redis";
import { closePool } from "./lib/database";
import { createApp } from "./app";
import { sessionManager } from "./services/SessionManager";
import { messageQueue, queueEvents } from "./queues/messageQueue";
import { createMessageWorker } from "./workers/messageWorker";
import type { Worker } from "bullmq";
import type { MessageJobResult, SendMessageJobData } from "./types";
import http from "http";

async function bootstrap(): Promise<void> {
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  logger.info(" WhatsApp Notification Microservice");
  logger.info(` Node.js ${process.version} | ${env.NODE_ENV}`);
  logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1. Redis hanya dibutuhkan untuk antrean BullMQ. Redis mati TIDAK boleh
  //    membuat service mati total — endpoint HTTP, sesi WhatsApp, dan pengiriman
  //    langsung (fallback tanpa antrean) tetap harus hidup supaya admin bisa
  //    scan QR dan kirim pesan. ioredis reconnect sendiri di background.
  let redisReady = false;
  try {
    const redis = getRedis();
    await redis.connect();
    redisReady = true;
    logger.info("Redis connection established");
  } catch (err) {
    logger.error(
      "Redis tidak dapat dihubungi saat startup — antrean dinonaktifkan sementara",
      { error: (err as Error).message }
    );
  }

  // 2. Create Express app
  const app = createApp();
  const server = http.createServer(app);

  // 3. Start BullMQ worker (hanya bila Redis ada)
  let worker: Worker<SendMessageJobData, MessageJobResult> | null = null;

  if (redisReady) {
    worker = createMessageWorker();
  } else {
    logger.warn(
      "BullMQ worker tidak dijalankan (Redis tidak tersedia). " +
        "Pengiriman pesan memakai mode langsung."
    );
  }

  // 4. Initialize WhatsApp session (non-blocking)
  logger.info("Starting WhatsApp session initialization...");
  sessionManager.initialize().catch((err) => {
    logger.error("Failed to initialize WhatsApp session", {
      error: (err as Error).message,
    });
  });

  // 5. Start HTTP server
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, env.HOST, () => {
      logger.info(`HTTP server listening on http://${env.HOST}:${env.PORT}`);
      logger.info(`Health: http://${env.HOST}:${env.PORT}/health`);
      logger.info(`Session QR (SSE): http://${env.HOST}:${env.PORT}/api/session/qr`);
      resolve();
    });
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal} — starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed");
    });

    const timeout = setTimeout(() => {
      logger.error("Graceful shutdown timed out (30s). Force exiting.");
      process.exit(1);
    }, 30_000);

    try {
      // Close in order: worker → queueEvents → queue → session → db connections
      if (worker) {
        logger.info("Closing worker...");
        await worker.close();
      }

      // Selalu tutup queue & queueEvents: keduanya dibuat di module scope, jadi
      // koneksi Redis-nya tetap terbuka walau worker tidak pernah start
      // (Redis tidak tersedia saat boot). Kalau tidak ditutup, proses tidak
      // bisa exit bersih dan docker harus SIGKILL setelah timeout.
      logger.info("Closing queue events...");
      await queueEvents.close();

      logger.info("Closing message queue...");
      await messageQueue.close();

      logger.info("Destroying WhatsApp session...");
      await sessionManager.destroy();

      if (redisReady) {
        logger.info("Closing Redis...");
        await closeRedis();
      } else {
        // Startup gagal connect: ioredis masih di mode auto-reconnect yang
        // menahan event loop, jadi proses tidak akan exit sendiri. Putuskan
        // paksa supaya container benar-benar mati bersih.
        logger.info("Closing Redis (force disconnect, was not ready)...");
        getRedis().disconnect();
      }

      logger.info("Closing MySQL pool...");
      await closePool();

      clearTimeout(timeout);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      clearTimeout(timeout);
      logger.error("Error during shutdown", { error: (err as Error).message });
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    void shutdown("uncaughtException");
  });
}

bootstrap().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
