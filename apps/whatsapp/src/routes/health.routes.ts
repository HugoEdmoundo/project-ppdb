/**
 * src/routes/health.routes.ts
 *
 * Health check endpoint.
 * GET /health — Public (no auth required)
 * GET /health/detailed — Internal (requires API key)
 */

import { Router, Request, Response } from "express";
import type { Router as ExpressRouter } from "express";
import { getRedis } from "../lib/redis";
import { getPool } from "../lib/database";
import { sessionManager } from "../services/SessionManager";
import { getQueueStats } from "../queues/messageQueue";

const router: ExpressRouter = Router();

// GET /health — Simple liveness probe
router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "whatsapp-service", ts: new Date().toISOString() });
});

// GET /health/detailed — Full readiness check
router.get("/detailed", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: "ok" | "error"; detail?: string }> = {};
  let overallOk = true;

  // Redis check
  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = { status: "ok" };
  } catch (err) {
    checks.redis = { status: "error", detail: (err as Error).message };
    overallOk = false;
  }

  // MySQL check
  try {
    const pool = getPool();
    const [rows] = await pool.execute("SELECT 1 as ok") as [Array<{ ok: number }>, unknown];
    checks.mysql = { status: rows[0]?.ok === 1 ? "ok" : "error" };
  } catch (err) {
    checks.mysql = { status: "error", detail: (err as Error).message };
    overallOk = false;
  }

  // WhatsApp session check
  const sessionInfo = sessionManager.getStatus();
  checks.whatsapp = {
    status: sessionInfo.status === "ready" ? "ok" : "error",
    detail: sessionInfo.status,
  };

  // Queue stats
  let queueStats = {};
  try {
    queueStats = await getQueueStats();
    checks.queue = { status: "ok" };
  } catch (err) {
    checks.queue = { status: "error", detail: (err as Error).message };
  }

  res.status(overallOk ? 200 : 503).json({
    status: overallOk ? "ok" : "degraded",
    service: "whatsapp-service",
    ts: new Date().toISOString(),
    checks,
    queue: queueStats,
    session: {
      status: sessionInfo.status,
      phone: sessionInfo.phone
        ? `***${sessionInfo.phone.slice(-4)}`
        : undefined,
      connectedAt: sessionInfo.connectedAt,
    },
  });
});

export default router;
