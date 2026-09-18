/**
 * src/services/WebhookService.ts
 *
 * Dispatches delivery status callbacks to the FastAPI backend.
 * Uses HMAC-SHA256 signature for authentication.
 *
 * FastAPI endpoint receives: POST /notifications/webhook/whatsapp
 * Headers: X-WA-Signature: sha256=<hmac>, X-WA-Timestamp: <unix>
 */

import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import type { WebhookPayload } from "../types";

const MAX_RETRY = 3;
const RETRY_DELAYS = [1_000, 5_000, 15_000]; // 1s, 5s, 15s

export class WebhookService {
  private readonly webhookUrl: string | undefined;
  private readonly secret: string;

  constructor() {
    this.webhookUrl = env.WEBHOOK_URL;
    this.secret = env.WEBHOOK_SECRET;
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Dispatch a webhook event to FastAPI.
   * Non-blocking — errors are logged but NOT thrown.
   */
  dispatch(event: WebhookPayload["event"], data: Record<string, unknown>): void {
    if (!this.webhookUrl) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Fire-and-forget with retry
    this.sendWithRetry(payload, 0).catch((err) => {
      logger.error("[Webhook] All retry attempts failed", {
        event,
        error: (err as Error).message,
      });
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async sendWithRetry(
    payload: WebhookPayload,
    attempt: number
  ): Promise<void> {
    const url = this.webhookUrl!;
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign(body, timestamp);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WA-Signature": `sha256=${signature}`,
          "X-WA-Timestamp": timestamp,
          "User-Agent": "ptdarrahman-wa-service/1.0",
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      logger.debug("[Webhook] Dispatched", {
        event: payload.event,
        status: res.status,
      });
    } catch (err) {
      const errMsg = (err as Error).message;
      logger.warn("[Webhook] Dispatch failed", {
        event: payload.event,
        attempt: attempt + 1,
        error: errMsg,
      });

      if (attempt < MAX_RETRY - 1) {
        const delay = RETRY_DELAYS[attempt] ?? 15_000;
        await new Promise((r) => setTimeout(r, delay));
        return this.sendWithRetry(payload, attempt + 1);
      }

      throw err;
    }
  }

  private sign(body: string, timestamp: string): string {
    if (!this.secret) return "";
    return crypto
      .createHmac("sha256", this.secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
  }
}

export const webhookService = new WebhookService();
