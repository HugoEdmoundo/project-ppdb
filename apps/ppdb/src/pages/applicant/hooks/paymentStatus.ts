/**
 * Logika status pembayaran QRIS bersama (dipakai hook `useQrisPayment` dan
 * halaman pembayaran). Fungsi murni agar mudah diuji tanpa render.
 *
 * Prinsip yang dipegang:
 * - Status terminal (sukses/gagal/kedaluwarsa) HANYA berasal dari konfirmasi
 *   backend/gateway, tidak pernah dari countdown lokal.
 * - Transaksi yang belum pasti (`pending_verification`) atau status tak dikenal
 *   diperlakukan sebagai "sedang diverifikasi", bukan gagal.
 * - Selama masih ada transaksi terbuka, polling tetap berjalan tanpa peduli
 *   apakah countdown tampilan sudah habis.
 */

export type QrisPaymentType = 'form' | 'dp' | 'installment'

export type LocalPaymentState =
  | 'none'
  | 'loading'
  | 'awaiting_payment'
  | 'verifying'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'failed'
  | 'exception'

/** Status lokal transaksi yang masih terbuka (belum terminal). */
export const OPEN_TX_STATUSES = ['pending', 'pending_verification'] as const
/** Status lokal transaksi yang sudah terverifikasi sukses. */
export const PAID_TX_STATUSES = ['success', 'paid'] as const

export function isPaidTransaction(tx: any): boolean {
  return Boolean(tx) && (PAID_TX_STATUSES as readonly string[]).includes(tx.status)
}

export function isOpenTransaction(tx: any): boolean {
  return Boolean(tx) && (OPEN_TX_STATUSES as readonly string[]).includes(tx.status)
}

/** QR hanya boleh dirender bila transaksinya masih benar-benar bisa dibayar. */
export function canRenderQr(tx: any): boolean {
  return (
    Boolean(tx) &&
    tx.status === 'pending' &&
    typeof tx.qr_string === 'string' &&
    tx.qr_string.trim().length > 0
  )
}

/** Polling dilakukan selama transaksi belum terminal, termasuk `pending_verification`. */
export function shouldPollTransaction(tx: any): boolean {
  return isOpenTransaction(tx)
}

export function resolveLocalPaymentState(tx: any): LocalPaymentState {
  if (!tx) return 'none'
  if (isPaidTransaction(tx)) return 'paid'
  switch (tx.status) {
    case 'pending':
      return 'awaiting_payment'
    case 'pending_verification':
      return 'verifying'
    case 'cancelled':
      return 'cancelled'
    case 'expired':
      return 'expired'
    case 'failed':
      return 'failed'
    case 'exception':
      return 'exception'
    default:
      // Status tak dikenal: jangan pernah tampilkan sukses/gagal sepihak.
      return 'verifying'
  }
}

export function formatCountdown(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export interface SyncOutcome {
  kind:
    | 'paid'
    | 'cancelled'
    | 'expired'
    | 'failed'
    | 'exception'
    | 'pending'
    | 'verifying'
    | 'error'
  terminal: boolean
  message: string
}

/**
 * Petakan respons `POST /payment/transactions/{id}/sync-status` ke hasil yang
 * bermakna bagi UI. Kontrak backend: `{ status, message, provider_status,
 * transaction }` dengan `status` ∈ success|cancelled|exception|pending|
 * pending_verification (dan nilai lama failed/expired).
 */
export function mapSyncResponse(res: any): SyncOutcome {
  const status = String(res?.status ?? '').toLowerCase()
  switch (status) {
    case 'success':
    case 'paid':
      return { kind: 'paid', terminal: true, message: 'Pembayaran berhasil diverifikasi.' }
    case 'cancelled':
      return { kind: 'cancelled', terminal: true, message: 'Transaksi telah dibatalkan.' }
    case 'expired':
      return {
        kind: 'expired',
        terminal: true,
        message: 'Batas waktu pembayaran telah berakhir menurut gateway.',
      }
    case 'failed':
      return { kind: 'failed', terminal: true, message: 'Pembayaran dinyatakan gagal oleh gateway.' }
    case 'exception':
      return {
        kind: 'exception',
        terminal: true,
        message: 'Pembayaran diterima setelah tagihan dibatalkan. Menunggu pemeriksaan admin.',
      }
    case 'pending_verification':
      return {
        kind: 'verifying',
        terminal: false,
        message: 'Pembayaran sedang diperiksa. Mohon jangan membayar ulang.',
      }
    case 'pending':
      return {
        kind: 'pending',
        terminal: false,
        message: 'Pembayaran belum terdeteksi. Selesaikan pemindaian QRIS Anda.',
      }
    default:
      return {
        kind: 'verifying',
        terminal: false,
        message:
          'Status pembayaran belum dapat dipastikan. Mohon jangan membayar ulang; sistem akan memeriksa ulang.',
      }
  }
}

export interface CreateErrorInfo {
  kind: 'reconciling' | 'rejected' | 'network'
  message: string
}

/**
 * Klasifikasikan kegagalan `POST /payment/create-qris`.
 * - `reconciling`: respons tidak pasti/tidak lengkap — backend menyimpan
 *   transaksi `pending_verification` dan UI harus mengarahkan ke pemeriksaan,
 *   bukan mengklaim gagal atau membuat transaksi baru.
 * - `rejected`: permintaan ditolak dengan pasti (validasi 4xx).
 * - `network`: kegagalan koneksi/gateway yang aman untuk dicoba ulang.
 */
export function describeCreateError(err: any): CreateErrorInfo {
  const message = err?.message || 'Gagal membuat transaksi QRIS.'
  const status = typeof err?.status === 'number' ? err.status : undefined
  const explicitlyUncertain =
    /belum dapat dipastikan|ditandai untuk rekonsiliasi|tidak lengkap|hasil tidak pasti/i.test(
      message,
    )
  if (explicitlyUncertain || status === 504) {
    return {
      kind: 'reconciling',
      message:
        'Status pembuatan pembayaran belum dapat dipastikan. Sistem menandai transaksi untuk diperiksa — mohon jangan membuat pembayaran baru sampai status jelas.',
    }
  }
  if (status && status >= 400 && status < 500) {
    return { kind: 'rejected', message }
  }
  return { kind: 'network', message }
}
