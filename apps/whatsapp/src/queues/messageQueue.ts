/**
 * src/queues/messageQueue.ts
 *
 * BullMQ queue untuk pengiriman pesan WhatsApp.
 *
 * Queue features:
 * - Priority jobs (high/normal/low)
 * - Exponential backoff retry sesuai spesifikasi
 * - Job TTL — pesan kadaluarsa dihapus dari antrean
 * - Rate limiter per menit (WA_THROTTLE_PER_MINUTE)
 * - Dead letter tracking via failed jobs
 */

import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { env } from "../config/env";
import { createRedisConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { MAX_RETRY_ATTEMPTS } from "../lib/retry";
import type { SendMessageJobData, MessagePriority } from "../types";

export const QUEUE_NAME = "wa-send-message";

// ── Priority mapping ────────────────────────────────────────────────────────
// BullMQ: lower number = higher priority
const PRIORITY_MAP: Record<MessagePriority, number> = {
  high: 1,
  normal: 5,
  low: 10,
};

// ── Queue instance ──────────────────────────────────────────────────────────
export const messageQueue = new Queue<SendMessageJobData>(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: MAX_RETRY_ATTEMPTS,
    backoff: {
      type: "custom",
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days for analysis
    },
  },
});

// ── Queue Events ──────────────────────────────────────────────────────────
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: createRedisConnection(),
});

queueEvents.on("completed", ({ jobId }) => {
  logger.debug("[Queue] Job completed", { jobId });
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.warn("[Queue] Job failed", { jobId, reason: failedReason });
});

queueEvents.on("stalled", ({ jobId }) => {
  logger.warn("[Queue] Job stalled — will be retried", { jobId });
});

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enqueue a single WhatsApp message job.
 */
export async function enqueueMessage(
  data: SendMessageJobData,
  opts: Partial<JobsOptions> = {}
): Promise<string> {
  const priority = PRIORITY_MAP[data.priority];

  const job = await messageQueue.add(data.jobId, data, {
    priority,
    jobId: data.jobId, // Idempotency — same jobId won't be added twice
    ...opts,
  });

  logger.info("[Queue] Message enqueued", {
    jobId: job.id,
    to: data.to.replace(/\d(?=\d{4})/g, "*"), // mask number
    priority: data.priority,
    eventKey: data.eventKey,
  });

  return job.id ?? data.jobId;
}

/**
 * Enqueue multiple messages in bulk.
 */
export async function enqueueBulkMessages(
  jobs: SendMessageJobData[]
): Promise<string[]> {
  const bulkData = jobs.map((data) => ({
    name: data.jobId,
    data,
    opts: {
      priority: PRIORITY_MAP[data.priority],
      jobId: data.jobId,
    },
  }));

  const results = await messageQueue.addBulk(bulkData);
  logger.info("[Queue] Bulk messages enqueued", { count: results.length });
  return results.map((j) => j.id ?? "");
}

/**
 * Get queue stats.
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    messageQueue.getWaitingCount(),
    messageQueue.getActiveCount(),
    messageQueue.getCompletedCount(),
    messageQueue.getFailedCount(),
    messageQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Pause/resume queue (for maintenance).
 */
export async function pauseQueue(): Promise<void> {
  await messageQueue.pause();
  logger.info("[Queue] Queue paused");
}

export async function resumeQueue(): Promise<void> {
  await messageQueue.resume();
  logger.info("[Queue] Queue resumed");
}
