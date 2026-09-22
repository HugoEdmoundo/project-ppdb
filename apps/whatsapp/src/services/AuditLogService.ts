/**
 * src/services/AuditLogService.ts
 *
 * Writes notification delivery audit logs to the `notification_logs` table.
 * Shared table with FastAPI — schema-compatible.
 */

import { v4 as uuidv4 } from "uuid";
import { execute, query } from "../lib/database";
import type {
  NotificationLog,
  NotificationLogStatus,
  SendMessageJobData,
} from "../types";

export class AuditLogService {
  /**
   * Create a new log entry when a job is queued.
   */
  async createLog(
    job: SendMessageJobData,
    recipientName: string = "",
    recipientEmail: string = "",
    recipientPhone: string = ""
  ): Promise<string> {
    const id = `notiflog-${uuidv4()}`;

    await execute(
      `INSERT INTO notification_logs
         (id, template_id, event_key, recipient_user_id, recipient_name,
          recipient_email, recipient_phone, channel, subject_sent, body_sent,
          status, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'whatsapp', '', ?, 'queued', 0, NOW())`,
      [
        id,
        job.templateId ?? null,
        job.eventKey,
        job.recipientUserId,
        recipientName,
        recipientEmail,
        recipientPhone,
        job.message,
      ]
    );

    return id;
  }

  /**
   * Mark log as sent.
   */
  async markSent(logId: string, waMessageId: string): Promise<void> {
    await execute(
      `UPDATE notification_logs
       SET status = 'sent', wa_message_id = ?, sent_at = NOW(), error_message = NULL
       WHERE id = ?`,
      [waMessageId, logId]
    );
  }

  /**
   * Mark log as failed with error info.
   */
  async markFailed(
    logId: string,
    errorMessage: string,
    retryCount: number,
    status: NotificationLogStatus = "failed"
  ): Promise<void> {
    await execute(
      `UPDATE notification_logs
       SET status = ?, error_message = ?, retry_count = ?
       WHERE id = ?`,
      [status, errorMessage, retryCount, logId]
    );
  }

  /**
   * Increment retry count on a log entry.
   */
  async incrementRetry(logId: string): Promise<void> {
    await execute(
      "UPDATE notification_logs SET retry_count = retry_count + 1 WHERE id = ?",
      [logId]
    );
  }

  /**
   * Get paginated logs.
   */
  async getLogs(
    page: number = 1,
    perPage: number = 20,
    filters: {
      status?: NotificationLogStatus;
      eventKey?: string;
      recipientUserId?: string;
    } = {}
  ): Promise<{ data: NotificationLog[]; total: number }> {
    const offset = (page - 1) * perPage;
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters.eventKey) {
      conditions.push("event_key = ?");
      params.push(filters.eventKey);
    }
    if (filters.recipientUserId) {
      conditions.push("recipient_user_id = ?");
      params.push(filters.recipientUserId);
    }

    const where = conditions.join(" AND ");

    const [countRows, dataRows] = await Promise.all([
      query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM notification_logs WHERE ${where}`,
        params
      ),
      query<NotificationLog>(
        `SELECT * FROM notification_logs WHERE ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, perPage, offset]
      ),
    ]);

    return {
      data: dataRows,
      total: countRows[0]?.cnt ?? 0,
    };
  }

  /**
   * Get a single log entry by ID.
   */
  async getLog(id: string): Promise<NotificationLog | null> {
    const rows = await query<NotificationLog>(
      "SELECT * FROM notification_logs WHERE id = ?",
      [id]
    );
    return rows[0] ?? null;
  }
}

export const auditLogService = new AuditLogService();
