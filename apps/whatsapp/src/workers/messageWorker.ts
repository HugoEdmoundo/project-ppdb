/**
 * src/workers/messageWorker.ts
 *
 * BullMQ worker yang mengonsumsi queue `wa:send-message` dan mengirim
 * pesan via whatsapp-web.js.
 *
 * Handles:
 * - Phone number normalization & validation
 * - Invalid number → tidak di-retry, langsung mark failed
 * - WA not ready → delayed retry
 * - Rate limit detection
 * - Delivery audit log
 * - Webhook dispatch on success/failure
 * - Concurrency: 1 (serial) untuk menghindari WA ban
 */

import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import {
  normalizePhoneNumber,
  toWhatsAppId,
  maskPhone,
} from "../lib/phoneUtils";
import { getRetryDelay, NON_RETRYABLE_ERRORS } from "../lib/retry";
import { sessionManager } from "../services/SessionManager";
import { auditLogService } from "../services/AuditLogService";
import { webhookService } from "../services/WebhookService";
import { QUEUE_NAME } from "../queues/messageQueue";
import type { SendMessageJobData, MessageJobResult } from "../types";
import { env } from "../config/env";

// Throttle state
let _messagesSentThisMinute = 0;
let _throttleResetTime = Date.now() + 60_000;

function checkThrottle(): void {
  const now = Date.now();
  if (now >= _throttleResetTime) {
    _messagesSentThisMinute = 0;
    _throttleResetTime = now + 60_000;
  }

  if (_messagesSentThisMinute >= env.WA_THROTTLE_PER_MINUTE) {
    const waitMs = _throttleResetTime - now;
    throw Object.assign(new Error("Rate limit: throttled"), {
      code: "rate_limit",
      delay: waitMs,
    });
  }
}

async function processMessage(
  job: Job<SendMessageJobData>
): Promise<MessageJobResult> {
  const { jobId, to, message, eventKey, recipientUserId, templateId } = job.data;
  const logId = job.data.logId;

  const log = logger.child({
    jobId,
    eventKey,
    recipientUserId: recipientUserId?.slice(0, 8) + "...",
  });

  log.info("[Worker] Processing job", {
    to: maskPhone(to),
    attempt: job.attemptsMade + 1,
  });

  // 1. Normalize & validate phone number
  const normalized = normalizePhoneNumber(to);
  if (!normalized) {
    log.warn("[Worker] Invalid phone number — skipping retry", { to: maskPhone(to) });

    if (logId) {
      await auditLogService.markFailed(
        logId,
        `Invalid phone number: ${to}`,
        job.attemptsMade,
        "invalid_number"
      );
    }

    webhookService.dispatch("message.failed", {
      jobId,
      to: maskPhone(to),
      errorCode: "invalid_number",
      eventKey,
      recipientUserId,
    });

    const err = new Error(`Invalid phone number: ${to}`);
    Object.assign(err, { code: "invalid_number" });
    throw err;
  }

  const waId = toWhatsAppId(normalized);

  // 2. Check session readiness
  if (!sessionManager.isReady()) {
    log.warn("[Worker] Session not ready — will retry", {
      status: sessionManager.getStatus().status,
    });
    throw new Error("WhatsApp session not ready");
  }

  // 3. Apply throttle
  checkThrottle();

  // 4. Send message
  let waMessageId: string;
  try {
    waMessageId = await sessionManager.sendMessage(waId, message);
    _messagesSentThisMinute++;
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    const errorCode = e.code ?? "unknown";
    const errorMessage = e.message;

    log.error("[Worker] Failed to send message", {
      to: maskPhone(normalized),
      errorCode,
      errorMessage,
      attempt: job.attemptsMade + 1,
    });

    // Tidak retry jika nomor tidak terdaftar di WA
    if (
      errorMessage.includes("not registered") ||
      errorMessage.includes("not a valid WA") ||
      NON_RETRYABLE_ERRORS.includes(errorCode)
    ) {
      if (logId) {
        await auditLogService.markFailed(
          logId,
          errorMessage,
          job.attemptsMade,
          "invalid_number"
        );
      }

      webhookService.dispatch("message.failed", {
        jobId,
        to: maskPhone(normalized),
        errorCode: "not_on_whatsapp",
        errorMessage,
        eventKey,
        recipientUserId,
      });

      const finalErr = new Error(errorMessage);
      Object.assign(finalErr, { code: "not_on_whatsapp" });
      throw finalErr;
    }

    throw err; // Retryable
  }

  // 5. Update audit log
  if (logId) {
    await auditLogService.markSent(logId, waMessageId);
  }

  // 6. Webhook callback
  webhookService.dispatch("message.sent", {
    jobId,
    waMessageId,
    to: maskPhone(normalized),
    eventKey,
    recipientUserId,
    templateId,
  });

  log.info("[Worker] Message sent successfully", {
    to: maskPhone(normalized),
    waMessageId,
  });

  const result: MessageJobResult = {
    jobId,
    status: "sent",
    messageId: waMessageId,
    attempts: job.attemptsMade + 1,
    sentAt: new Date().toISOString(),
  };

  return result;
}

// Custom backoff strategy compatible dengan BullMQ v6
function backoffStrategy(attemptsMade: number): number {
  return getRetryDelay(attemptsMade);
}

export function createMessageWorker(): Worker<SendMessageJobData, MessageJobResult> {
  const worker = new Worker<SendMessageJobData, MessageJobResult>(
    QUEUE_NAME,
    processMessage,
    {
      connection: createRedisConnection(),
      concurrency: 1, // Serial — penting untuk menghindari WA ban
      settings: {
        backoffStrategy,
      },
    }
  );

  worker.on("completed", (job, result) => {
    logger.info("[Worker] Job completed", {
      jobId: job.id,
      waMessageId: result.messageId,
    });
  });

  worker.on("failed", (job, err) => {
    const e = err as Error & { code?: string };
    const isNonRetryable = e.code && NON_RETRYABLE_ERRORS.includes(e.code);

    if (isNonRetryable) {
      logger.info("[Worker] Job permanently failed (non-retryable)", {
        jobId: job?.id,
        code: e.code,
      });
    } else {
      logger.warn("[Worker] Job failed — will retry", {
        jobId: job?.id,
        attempt: job?.attemptsMade,
        error: e.message,
        nextDelay: job ? getRetryDelay(job.attemptsMade + 1) : null,
      });
    }
  });

  worker.on("error", (err) => {
    logger.error("[Worker] Worker error", { error: err.message });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("[Worker] Job stalled", { jobId });
  });

  logger.info("[Worker] Message worker started", { queue: QUEUE_NAME, concurrency: 1 });

  return worker;
}
