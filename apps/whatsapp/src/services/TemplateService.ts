/**
 * src/services/TemplateService.ts
 *
 * Loads notification templates from MySQL (notification_templates table)
 * and renders them with context variables.
 *
 * Templates use {variable_name} syntax (same as existing FastAPI system).
 * Simple in-memory cache with TTL to avoid hammering the DB on every message.
 */

import { query } from "../lib/database";
import { logger } from "../lib/logger";
import type { NotificationTemplate } from "../types";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  templates: Map<string, NotificationTemplate>;
  loadedAt: number;
}

export class TemplateService {
  private cache: CacheEntry | null = null;

  /**
   * Get a single template by event_key.
   * Returns null if not found or inactive.
   */
  async getTemplate(eventKey: string): Promise<NotificationTemplate | null> {
    const templates = await this.loadTemplates();
    const tpl = templates.get(eventKey);
    if (!tpl || !tpl.is_active) return null;
    return tpl;
  }

  /**
   * Get all active templates.
   */
  async getAllTemplates(): Promise<NotificationTemplate[]> {
    const templates = await this.loadTemplates();
    return Array.from(templates.values()).filter((t) => t.is_active);
  }

  /**
   * Render a template body with context variables.
   * Replaces {variable_name} placeholders.
   */
  renderBody(body: string, context: Record<string, string | number>): string {
    return body.replace(/\{(\w+)\}/g, (match, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Render full template (body + subject) with context.
   */
  render(
    template: NotificationTemplate,
    context: Record<string, string | number>
  ): { body: string; subject: string } {
    return {
      body: this.renderBody(template.body, context),
      subject: this.renderBody(template.email_subject ?? "", context),
    };
  }

  /**
   * Force-invalidate the cache (called after admin updates a template).
   */
  invalidateCache(): void {
    this.cache = null;
    logger.info("[TemplateService] Cache invalidated");
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async loadTemplates(): Promise<Map<string, NotificationTemplate>> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.templates;
    }

    logger.debug("[TemplateService] Loading templates from DB...");

    const rows = await query<NotificationTemplate>(
      "SELECT * FROM notification_templates ORDER BY event_key ASC"
    );

    const map = new Map<string, NotificationTemplate>();
    for (const row of rows) {
      map.set(row.event_key, row);
    }

    this.cache = { templates: map, loadedAt: Date.now() };
    logger.info("[TemplateService] Templates loaded", { count: map.size });
    return map;
  }
}

export const templateService = new TemplateService();
