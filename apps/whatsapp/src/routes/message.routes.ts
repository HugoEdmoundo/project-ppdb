/**
 * src/routes/message.routes.ts
 *
 * Message sending routes:
 *   POST /api/messages/send        — Send single message (direct)
 *   POST /api/messages/send-template — Send via template (rendered)
 *   POST /api/messages/bulk        — Bulk enqueue
 *   GET  /api/messages/queue       — Queue stats
 *   GET  /api/messages/logs        — Delivery logs
 *   GET  /api/messages/logs/:id    — Single log entry
 */

import { Router, Request, Response } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  enqueueMessage,
  enqueueBulkMessages,
  getQueueStats,
} from "../queues/messageQueue";
import { templateService } from "../services/TemplateService";
import { auditLogService } from "../services/AuditLogService";
import { sendRateLimiter } from "../middlewares/rateLimiter";
import { normalizePhoneNumber } from "../lib/phoneUtils";
import type { SendMessageJobData, NotificationLogStatus } from "../types";

const router: ExpressRouter = Router();

// ── Validation schemas ──────────────────────────────────────────────────────

const SendDirectSchema = z.object({
  to: z.string().min(8, "Phone number too short"),
  message: z.string().min(1, "Message cannot be empty").max(4096),
  eventKey: z.string().default("custom"),
  recipientUserId: z.string().optional(),
  templateId: z.string().optional(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
});

const SendTemplateSchema = z.object({
  to: z.string().min(8),
  eventKey: z.string().min(1, "eventKey is required"),
  recipientUserId: z.string().optional(),
  context: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
});

const BulkSendSchema = z.object({
  recipients: z
    .array(
      z.object({
        to: z.string().min(8),
        message: z.string().min(1).max(4096),
        recipientUserId: z.string().optional(),
      })
    )
    .min(1)
    .max(100, "Max 100 recipients per bulk request"),
  eventKey: z.string().default("bulk"),
  templateId: z.string().optional(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
});

const LogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["queued", "sent", "failed", "invalid_number"])
    .optional(),
  eventKey: z.string().optional(),
  recipientUserId: z.string().optional(),
});

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/messages/send
router.post("/send", sendRateLimiter, async (req: Request, res: Response) => {
  const body = SendDirectSchema.parse(req.body);

  const normalized = normalizePhoneNumber(body.to);
  if (!normalized) {
    res.status(422).json({
      success: false,
      error: `Invalid Indonesian phone number: ${body.to}`,
    });
    return;
  }

  const jobData: SendMessageJobData = {
    jobId: `msg-${uuidv4()}`,
    to: normalized,
    message: body.message,
    eventKey: body.eventKey,
    recipientUserId: body.recipientUserId ?? "unknown",
    templateId: body.templateId,
    priority: body.priority,
    enqueuedAt: new Date().toISOString(),
  };

  const logId = await auditLogService.createLog(jobData);
  jobData.logId = logId;

  const jobId = await enqueueMessage(jobData);

  res.status(202).json({
    success: true,
    message: "Message queued for delivery",
    data: { jobId, logId },
  });
});

// POST /api/messages/send-template
router.post(
  "/send-template",
  sendRateLimiter,
  async (req: Request, res: Response) => {
    const body = SendTemplateSchema.parse(req.body);

    const template = await templateService.getTemplate(body.eventKey);
    if (!template) {
      res.status(404).json({
        success: false,
        error: `Template with eventKey '${body.eventKey}' not found or inactive`,
      });
      return;
    }

    if (template.channel !== "whatsapp" && template.channel !== "both") {
      res.status(422).json({
        success: false,
        error: `Template '${body.eventKey}' does not have whatsapp channel (channel: ${template.channel})`,
      });
      return;
    }

    const normalized = normalizePhoneNumber(body.to);
    if (!normalized) {
      res.status(422).json({
        success: false,
        error: `Invalid phone number: ${body.to}`,
      });
      return;
    }

    const { body: renderedBody } = templateService.render(template, body.context);

    const jobData: SendMessageJobData = {
      jobId: `msg-${uuidv4()}`,
      to: normalized,
      message: renderedBody,
      eventKey: body.eventKey,
      recipientUserId: body.recipientUserId ?? "unknown",
      templateId: template.id,
      priority: body.priority,
      enqueuedAt: new Date().toISOString(),
    };

    const logId = await auditLogService.createLog(jobData);
    jobData.logId = logId;

    const jobId = await enqueueMessage(jobData);

    res.status(202).json({
      success: true,
      message: "Template message queued for delivery",
      data: { jobId, logId, renderedBody },
    });
  }
);

// POST /api/messages/bulk
router.post("/bulk", sendRateLimiter, async (req: Request, res: Response) => {
  const body = BulkSendSchema.parse(req.body);

  const jobs: SendMessageJobData[] = [];
  const invalid: string[] = [];

  for (const recipient of body.recipients) {
    const normalized = normalizePhoneNumber(recipient.to);
    if (!normalized) {
      invalid.push(recipient.to);
      continue;
    }

    jobs.push({
      jobId: `msg-${uuidv4()}`,
      to: normalized,
      message: recipient.message,
      eventKey: body.eventKey,
      recipientUserId: recipient.recipientUserId ?? "unknown",
      templateId: body.templateId,
      priority: body.priority,
      enqueuedAt: new Date().toISOString(),
    });
  }

  if (jobs.length === 0) {
    res.status(422).json({
      success: false,
      error: "No valid recipients",
      invalidNumbers: invalid,
    });
    return;
  }

  const jobIds = await enqueueBulkMessages(jobs);

  res.status(202).json({
    success: true,
    message: `${jobs.length} messages queued`,
    data: {
      queued: jobs.length,
      skipped: invalid.length,
      invalidNumbers: invalid,
      jobIds,
    },
  });
});

// GET /api/messages/queue
router.get("/queue", async (_req: Request, res: Response) => {
  const stats = await getQueueStats();
  res.json({ success: true, data: stats });
});

// GET /api/messages/logs
router.get("/logs", async (req: Request, res: Response) => {
  const queryParams = LogsQuerySchema.parse(req.query);

  const result = await auditLogService.getLogs(queryParams.page, queryParams.perPage, {
    status: queryParams.status as NotificationLogStatus | undefined,
    eventKey: queryParams.eventKey,
    recipientUserId: queryParams.recipientUserId,
  });

  res.json({
    success: true,
    data: result.data,
    total: result.total,
    page: queryParams.page,
    perPage: queryParams.perPage,
    totalPages: Math.ceil(result.total / queryParams.perPage),
  });
});

// GET /api/messages/logs/:id
router.get("/logs/:id", async (req: Request, res: Response) => {
  const id = req.params["id"] as string;
  const log = await auditLogService.getLog(id);
  if (!log) {
    res.status(404).json({ success: false, error: "Log entry not found" });
    return;
  }
  res.json({ success: true, data: log });
});

export default router;
