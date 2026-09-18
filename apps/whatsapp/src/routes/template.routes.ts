/**
 * src/routes/template.routes.ts
 *
 * Template CRUD routes (admin-configurable templates).
 * Data stored in shared notification_templates MySQL table.
 *
 *   GET    /api/templates           — List all templates
 *   GET    /api/templates/:id       — Get template by ID
 *   GET    /api/templates/key/:key  — Get template by event_key
 *   PUT    /api/templates/:id       — Update template
 *   POST   /api/templates/cache/clear — Invalidate template cache
 */

import { Router, Request, Response } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";
import { query, execute } from "../lib/database";
import { templateService } from "../services/TemplateService";
import type { NotificationTemplate } from "../types";

const router: ExpressRouter = Router();

const UpdateTemplateSchema = z.object({
  label: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  email_subject: z.string().optional(),
  channel: z.enum(["email", "whatsapp", "both"]).optional(),
  is_active: z.boolean().optional(),
});

// GET /api/templates
router.get("/", async (_req: Request, res: Response) => {
  const rows = await query<NotificationTemplate>(
    "SELECT * FROM notification_templates ORDER BY event_key ASC"
  );
  res.json({ success: true, data: rows });
});

// GET /api/templates/key/:key
router.get("/key/:key", async (req: Request, res: Response) => {
  const rows = await query<NotificationTemplate>(
    "SELECT * FROM notification_templates WHERE event_key = ?",
    [req.params.key]
  );
  if (!rows[0]) {
    res.status(404).json({ success: false, error: "Template not found" });
    return;
  }
  res.json({ success: true, data: rows[0] });
});

// GET /api/templates/:id
router.get("/:id", async (req: Request, res: Response) => {
  const rows = await query<NotificationTemplate>(
    "SELECT * FROM notification_templates WHERE id = ?",
    [req.params.id]
  );
  if (!rows[0]) {
    res.status(404).json({ success: false, error: "Template not found" });
    return;
  }
  res.json({ success: true, data: rows[0] });
});

// PUT /api/templates/:id
router.put("/:id", async (req: Request, res: Response) => {
  const updates = UpdateTemplateSchema.parse(req.body);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: "No fields to update" });
    return;
  }

  const setClauses = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = [...Object.values(updates), req.params.id];

  const result = await execute(
    `UPDATE notification_templates SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    res.status(404).json({ success: false, error: "Template not found" });
    return;
  }

  // Invalidate cache so next use picks up new template
  templateService.invalidateCache();

  const rows = await query<NotificationTemplate>(
    "SELECT * FROM notification_templates WHERE id = ?",
    [req.params.id]
  );

  res.json({ success: true, data: rows[0] });
});

// POST /api/templates/cache/clear
router.post("/cache/clear", (_req: Request, res: Response) => {
  templateService.invalidateCache();
  res.json({ success: true, message: "Template cache cleared" });
});

export default router;
