/**
 * src/types/index.ts
 *
 * Shared TypeScript types & interfaces used across the microservice.
 */

// ─── WhatsApp Session ───────────────────────────────────────────────────────

export type WASessionStatus =
  | "initializing"   // Client object created, belum ada QR
  | "qr"             // Menunggu scan QR
  | "authenticated"  // QR sudah di-scan, autentikasi sedang berlangsung
  | "ready"          // Session siap kirim pesan
  | "disconnected"   // Terputus (akan auto-reconnect)
  | "destroyed";     // Session dihapus permanen

export interface WASessionInfo {
  status: WASessionStatus;
  phone?: string;       // Nomor WA yang tersambung (tersedia setelah ready)
  pushName?: string;    // Nama profil WhatsApp
  qrCode?: string;       // RAW QR string — hanya saat status = qr (dirender frontend via JS lib)
  pairingCode?: string; // Kode pairing ("Link with phone number instead") — saat login via nomor HP
  pairingPhone?: string;// Nomor HP yang dipakai untuk pairing
  lastActivity?: Date;
  connectedAt?: Date;
  lastError?: string;   // Pesan error terakhir saat inisialisasi/QR (untuk debugging frontend)
}

// ─── Message Queue ──────────────────────────────────────────────────────────

export type NotificationChannel = "whatsapp" | "email" | "both";

export type MessagePriority = "high" | "normal" | "low";

export interface SendMessageJobData {
  /** Unique job ID (digenerate sebelum enqueue untuk idempotency) */
  jobId: string;

  /** Nomor WA tujuan (format: 628xxx atau 08xxx — dinormalisasi sebelum kirim) */
  to: string;

  /** Pesan yang sudah di-render (template sudah diisi variabelnya) */
  message: string;

  /** Metadata untuk audit log */
  eventKey: string;
  recipientUserId: string;
  templateId?: string;

  /** Optional: audit log ID yang sudah dibuat sebelum enqueue */
  logId?: string;

  priority: MessagePriority;

  /** Timestamp original enqueue (untuk TTL check) */
  enqueuedAt: string;
}

export type MessageJobStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "invalid_number"
  | "expired";

export interface MessageJobResult {
  jobId: string;
  status: MessageJobStatus;
  messageId?: string;   // ID dari whatsapp-web.js jika berhasil
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  sentAt?: string;
}

// ─── Notification Templates ─────────────────────────────────────────────────

export interface NotificationTemplate {
  id: string;
  event_key: string;
  label: string;
  channel: string;   // email | whatsapp | both
  email_subject?: string;
  body: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// ─── Audit / Notification Log ───────────────────────────────────────────────

export type NotificationLogStatus =
  | "queued"
  | "sent"
  | "failed"
  | "invalid_number";

export interface NotificationLog {
  id: string;
  template_id?: string;
  event_key: string;
  recipient_user_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  channel: string;
  subject_sent?: string;
  body_sent: string;
  status: NotificationLogStatus;
  error_message?: string;
  wa_message_id?: string;
  retry_count: number;
  sent_at?: Date;
  created_at?: Date;
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: "message.sent" | "message.failed" | "session.ready" | "session.disconnected";
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── API Request/Response ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface SendNotificationRequest {
  to: string;
  message: string;
  eventKey?: string;
  recipientUserId?: string;
  templateId?: string;
  priority?: MessagePriority;
}

export interface BulkSendRequest {
  recipients: Array<{
    to: string;
    message: string;
    recipientUserId?: string;
  }>;
  eventKey?: string;
  templateId?: string;
  priority?: MessagePriority;
}
