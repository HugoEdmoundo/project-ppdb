/**
 * src/lib/phoneUtils.ts
 *
 * Phone number normalization & validation utilities for Indonesian numbers.
 * whatsapp-web.js membutuhkan format: 628xxxxxxxxxx@c.us
 */

/**
 * Normalize Indonesian phone number ke format internasional (tanpa +).
 * Input: 08xx, 8xx, +628xx, 628xx
 * Output: 628xxxxxxxxxx
 *
 * Returns null jika nomor tidak valid.
 */
export function normalizePhoneNumber(phone: string): string | null {
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, "");

  if (!cleaned) return null;

  // 0811... → 62811...
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  // 811... (tanpa prefix) → 62811...
  if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }

  // Validasi panjang: nomor Indonesia 62 + 8-12 digit = 10-14 digit total
  if (cleaned.length < 10 || cleaned.length > 15) return null;

  // Harus dimulai 62 diikuti 8
  if (!cleaned.match(/^628\d{7,11}$/)) return null;

  return cleaned;
}

/**
 * Convert normalized phone number ke format WhatsApp JID.
 * 628xxxxxxxxxx → 628xxxxxxxxxx@c.us
 */
export function toWhatsAppId(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) throw new Error(`Invalid phone number: ${phone}`);
  return `${normalized}@c.us`;
}

/**
 * Check apakah string adalah nomor telepon Indonesia yang valid.
 */
export function isValidIndonesianPhone(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Mask nomor telepon untuk logging (62812****5678).
 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhoneNumber(phone) ?? phone;
  if (normalized.length <= 6) return "***";
  const start = normalized.slice(0, 4);
  const end = normalized.slice(-4);
  const middle = "*".repeat(Math.max(4, normalized.length - 8));
  return `${start}${middle}${end}`;
}
