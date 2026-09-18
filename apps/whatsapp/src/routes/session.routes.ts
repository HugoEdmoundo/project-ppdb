/**
 * src/routes/session.routes.ts
 *
 * WhatsApp Session Management Routes:
 *   GET  /api/session           — Get current session status
 *   POST /api/session/init      — Initialize / reconnect session
 *   POST /api/session/logout    — Logout (clears auth data)
 *   DELETE /api/session         — Destroy session (no reconnect)
 *   GET  /api/session/qr        — Get QR code (SSE stream)
 *   GET  /api/session/qr/image  — Get QR code as data URL (one-shot)
 */

import { Router, Request, Response } from "express";
import type { Router as ExpressRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { sessionManager } from "../services/SessionManager";
import { sseRateLimiter } from "../middlewares/rateLimiter";
import { logger } from "../lib/logger";

const router: ExpressRouter = Router();

// GET /api/session
router.get("/", (_req: Request, res: Response) => {
  const status = sessionManager.getStatus();
  res.json({
    success: true,
    data: {
      ...status,
      // Never expose full QR in status — use /qr/image endpoint
      qrCode: status.qrCode ? "[available at GET /api/session/qr/image]" : undefined,
    },
  });
});

// POST /api/session/init
router.post("/init", async (_req: Request, res: Response) => {
  const current = sessionManager.getStatus();

  if (current.status === "ready") {
    res.json({
      success: true,
      message: "Session already active",
      data: { status: current.status, phone: current.phone },
    });
    return;
  }

  // Non-blocking init
  sessionManager.initialize().catch((err) => {
    logger.error("[Route] Session init error", { error: (err as Error).message });
  });

  res.json({
    success: true,
    message: "Session initialization started. Connect to /api/session/qr for QR code.",
  });
});

// POST /api/session/logout
router.post("/logout", async (_req: Request, res: Response) => {
  try {
    await sessionManager.logout();
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// DELETE /api/session
router.delete("/", async (_req: Request, res: Response) => {
  try {
    await sessionManager.destroy();
    res.json({ success: true, message: "Session destroyed" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// GET /api/session/qr — SSE stream
router.get("/qr", sseRateLimiter, (req: Request, res: Response) => {
  const clientId = uuidv4();

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
  res.flushHeaders();

  // Send initial comment to establish connection
  res.write(": connected\n\n");

  // Register SSE client
  const unsubscribe = sessionManager.addSseClient(clientId, (data) => {
    res.write(data);
  });

  // Keepalive ping every 25s
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 25_000);

  // Cleanup on client disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    logger.debug("[SSE] Client disconnected", { clientId });
  });

  logger.debug("[SSE] Client connected", { clientId });
});

// GET /api/session/qr/image — one-shot QR data URL
router.get("/qr/image", (_req: Request, res: Response) => {
  const status = sessionManager.getStatus();

  if (status.status !== "qr" || !status.qrCode) {
    res.status(404).json({
      success: false,
      error: "No QR code available. Session may already be authenticated.",
      currentStatus: status.status,
    });
    return;
  }

  res.json({
    success: true,
    data: {
      qrCode: status.qrCode,
      hint: "Scan this QR with WhatsApp on your phone",
    },
  });
});

export default router;
