/**
 * src/services/SessionManager.ts
 *
 * WhatsApp Single Session Manager menggunakan whatsapp-web.js.
 *
 * Responsibilities:
 * - Initialize/destroy Puppeteer + WA client
 * - Emit QR code via SSE (Server-Sent Events) ke admin
 * - Track session state
 * - Auto-reconnect pada disconnect
 * - Graceful shutdown
 */

import path from "path";
import { EventEmitter } from "events";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import type { WASessionInfo, WASessionStatus } from "../types";

export type SessionEvent =
  | { type: "status"; data: WASessionInfo }
  | { type: "qr"; data: { raw: string } }
  | { type: "code"; data: { code: string; phone?: string } }
  | { type: "ready"; data: WASessionInfo }
  | { type: "disconnected"; data: { reason: string } }
  | { type: "message_create"; data: Message };

export class SessionManager extends EventEmitter {
  private client: Client | null = null;
  private sessionInfo: WASessionInfo = { status: "disconnected" };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private isShuttingDown = false;
  private initializePromise: Promise<void> | null = null;
  private pairingActive = false;

  // SSE subscribers
  private sseClients: Set<{
    id: string;
    write: (data: string) => void;
  }> = new Set();

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getStatus(): WASessionInfo {
    return { ...this.sessionInfo };
  }

  isReady(): boolean {
    return this.sessionInfo.status === "ready";
  }

  /**
   * Initialize WhatsApp client.
   * Safe to call multiple times — idempotent.
   */
  async initialize(): Promise<void> {
    if (this.client && this.sessionInfo.status !== "destroyed") {
      logger.info("[Session] Already initialized, skipping");
      return;
    }

    if (this.initializePromise) {
      logger.info("[Session] Initialization already in progress, awaiting...");
      return this.initializePromise;
    }

    logger.info("[Session] Initializing WhatsApp client...");
    this.updateStatus("initializing");

    const puppeteerArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1280,720",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-crash-reporter",
    ];

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.resolve(env.WA_SESSION_PATH),
        clientId: "ptdarrahman-wa",
      }),
      puppeteer: {
        headless: true,
        executablePath: env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: puppeteerArgs,
      },
      webVersion: "2.3000.1023204227-alpha",
      webVersionCache: {
        type: "remote",
        remotePath:
          "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1023204227-alpha.html",
      },
    });

    this.attachEventHandlers();

    const initPromise = (async () => {
      try {
        // Timeout 90 detik supaya tidak macet selamanya jika Chromium/WA hang
        await Promise.race([
          this.client!.initialize(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Inisialisasi timeout (90s) — cek Chromium/Redis/port")), 90_000)
          ),
        ]);
        // Sukses → lastError dibersihkan via updateStatus("ready"/"qr"/"authenticated")
      } catch (err) {
        const msg = (err as Error).message;
        logger.error("[Session] Failed to initialize client", { error: msg });
        this.updateStatus("disconnected", { lastError: msg });
        if (!this.isShuttingDown) {
          this.scheduleReconnect();
        }
      }
    })();

    this.initializePromise = initPromise;
    try {
      await initPromise;
    } finally {
      if (this.initializePromise === initPromise) this.initializePromise = null;
    }
  }

  /**
   * Send a WhatsApp message.
   * Throws if session not ready.
   */
  async sendMessage(to: string, message: string): Promise<string> {
    if (!this.client || !this.isReady()) {
      throw new Error("WhatsApp session is not ready");
    }

    const msg = await this.client.sendMessage(to, message);
    return msg.id._serialized;
  }

  /**
   * Destroy the session (logout + cleanup).
   */
  async destroy(): Promise<void> {
    this.isShuttingDown = true;
    this.clearReconnectTimer();

    if (this.client) {
      logger.info("[Session] Destroying client...");
      try {
        await this.client.destroy();
      } catch (err) {
        logger.warn("[Session] Error during destroy", {
          error: (err as Error).message,
        });
      }
      this.client = null;
    }

    this.updateStatus("destroyed");
    logger.info("[Session] Session destroyed");
  }

  /**
   * Logout from WhatsApp (clears auth data).
   */
  async logout(): Promise<void> {
    if (!this.client) throw new Error("No active session");

    logger.info("[Session] Logging out...");
    await this.client.logout();
    this.updateStatus("destroyed");
  }

  /**
   * Generate pairing code via "Link with phone number instead" (bukan QR).
   * @param phone Nomor HP internasional tanpa simbol (cth 628123456789)
   * @param showNotification Tampilkan notifikasi pairing di HP target
   */
  async requestPairingCode(
    phone: string,
    showNotification = true
  ): Promise<{ code: string; phone: string }> {
    if (this.isReady()) {
      throw new Error("WhatsApp sudah terhubung — tidak perlu pairing.");
    }

    const normalized = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    if (normalized.length < 10) {
      throw new Error(
        "Nomor HP tidak valid. Gunakan format internasional, mis. 628123456789"
      );
    }

    // Pastikan client sudah siap (halaman WA terbuka) sebelum request kode.
    if (!this.client || this.sessionInfo.status === "destroyed") {
      await this.initialize();
    }
    if (this.initializePromise) {
      await this.initializePromise;
    }
    if (!this.client) {
      throw new Error("WhatsApp client tidak tersedia.");
    }

    this.pairingActive = true;
    this.updateStatus("qr", { pairingPhone: normalized });

    let code: string;
    try {
      code = await this.client.requestPairingCode(normalized, showNotification);
    } catch (err) {
      this.pairingActive = false;
      throw new Error(
        `Gagal membuat pairing code: ${(err as Error).message}. ` +
          "Pastikan sesi dalam kondisi menunggu taut (bukan sudah terhubung).",
        { cause: err }
      );
    }

    this.updateStatus("qr", { pairingPhone: normalized, pairingCode: code });
    this.broadcastSse("code", { code, phone: normalized });
    logger.info("[Session] Pairing code generated", { phone: `***${normalized.slice(-4)}` });

    return { code, phone: normalized };
  }

  /**
   * Batalkan pairing code dan kembali ke mode QR.
   */
  async cancelPairingCode(): Promise<void> {
    this.pairingActive = false;
    if (this.client) {
      try {
        await this.client.cancelPairingCode();
      } catch (err) {
        logger.warn("[Session] cancelPairingCode error", {
          error: (err as Error).message,
        });
      }
    }
    delete this.sessionInfo.pairingCode;
    delete this.sessionInfo.pairingPhone;
    this.updateStatus("qr");
    logger.info("[Session] Pairing code dibatalkan, kembali ke mode QR");
  }

  // ── SSE (Server-Sent Events) ───────────────────────────────────────────────

  /**
   * Register an SSE client to receive real-time session events.
   * Returns an unsubscribe function.
   */
  addSseClient(
    id: string,
    write: (data: string) => void
  ): () => void {
    const client = { id, write };
    this.sseClients.add(client);
    logger.debug("[Session] SSE client connected", { id, total: this.sseClients.size });

    // Send current status immediately
    this.sendSseEvent(client, "status", this.sessionInfo);

    return () => {
      this.sseClients.delete(client);
      logger.debug("[Session] SSE client disconnected", {
        id,
        total: this.sseClients.size,
      });
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private attachEventHandlers(): void {
    if (!this.client) return;

    this.client.on("qr", async (qr) => {
      if (this.pairingActive) {
        // Login via pairing code aktif — QR tidak relevan, jangan timpa state.
        logger.debug("[Session] Pairing code aktif, QR diabaikan");
        return;
      }

      logger.info("[Session] QR code received — scan with WhatsApp");
      this.reconnectAttempts = 0;

      // Kirim RAW QR string saja — rendering QR jadi tanggung jawab frontend
      // (library QR JS), bukan PNG/image yang digenerate server.
      this.updateStatus("qr", { qrCode: qr });
      this.broadcastSse("qr", { raw: qr });
    });

    this.client.on("authenticated", () => {
      this.pairingActive = false;
      logger.info("[Session] Authenticated successfully");
      this.updateStatus("authenticated");
    });

    this.client.on("code", (code: string) => {
      logger.info("[Session] Pairing code diterima dari client");
      this.updateStatus("qr", {
        pairingPhone: this.sessionInfo.pairingPhone,
        pairingCode: code,
      });
      this.broadcastSse("code", { code, phone: this.sessionInfo.pairingPhone });
    });

    this.client.on("auth_failure", (msg) => {
      logger.error("[Session] Authentication failed", { reason: msg });
      this.updateStatus("disconnected");
      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });

    this.client.on("ready", async () => {
      this.pairingActive = false;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();

      let phone: string | undefined;
      let pushName: string | undefined;

      try {
        const info = this.client!.info;
        phone = info?.wid?.user;
        pushName = info?.pushname;
      } catch {
        // info might not be available immediately
      }

      const info: WASessionInfo = {
        status: "ready",
        phone,
        pushName,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.updateStatus("ready", info);
      this.broadcastSse("ready", info);

      logger.info("[Session] WhatsApp session ready", {
        phone: phone ? `***${phone.slice(-4)}` : "unknown",
        pushName,
      });
    });

    this.client.on("disconnected", (reason) => {
      logger.warn("[Session] Disconnected", { reason });
      this.pairingActive = false;
      this.updateStatus("disconnected");
      this.broadcastSse("disconnected", { reason });

      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });

    this.client.on("message_create", (msg) => {
      this.sessionInfo.lastActivity = new Date();
      this.emit("message_create", msg);
    });
  }

  private updateStatus(
    status: WASessionStatus,
    extra: Partial<WASessionInfo> = {}
  ): void {
    this.sessionInfo = {
      ...this.sessionInfo,
      status,
      ...extra,
    };

    // Clear QR & pairing code when no longer needed
    if (status !== "qr") {
      delete this.sessionInfo.qrCode;
      delete this.sessionInfo.pairingCode;
      delete this.sessionInfo.pairingPhone;
    }

    // Clear lastError when reaching a good/active state
    if (status === "ready" || status === "qr" || status === "authenticated") {
      delete this.sessionInfo.lastError;
    }

    this.broadcastSse("status", this.sessionInfo);
    this.emit("status", this.sessionInfo);
  }

  private broadcastSse(event: string, data: unknown): void {
    if (this.sseClients.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const dead: typeof this.sseClients extends Set<infer T> ? T[] : never[] =
      [];

    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        dead.push(client as never);
      }
    }

    for (const d of dead) {
      this.sseClients.delete(d as (typeof dead)[0]);
    }
  }

  private sendSseEvent(
    client: { id: string; write: (d: string) => void },
    event: string,
    data: unknown
  ): void {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.sseClients.delete(client);
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error("[Session] Max reconnect attempts reached. Manual intervention required.");
      return;
    }

    this.clearReconnectTimer();

    // Exponential backoff: 5s, 10s, 20s, 40s, ... capped at 5m
    const delay = Math.min(5_000 * Math.pow(2, this.reconnectAttempts), 300_000);
    this.reconnectAttempts++;

    logger.info("[Session] Scheduling reconnect", {
      attempt: this.reconnectAttempts,
      delayMs: delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      logger.info("[Session] Attempting reconnect...", {
        attempt: this.reconnectAttempts,
      });

      // Destroy old client first
      if (this.client) {
        try {
          await this.client.destroy();
        } catch {
          // ignore
        }
        this.client = null;
      }

      await this.initialize();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
