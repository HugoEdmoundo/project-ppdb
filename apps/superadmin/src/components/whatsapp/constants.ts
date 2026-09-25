export type LoginMethod = 'qr' | 'phone'

export const LOG_STATUSES = ['', 'queued', 'sent', 'failed', 'invalid_number'] as const

export function formatWhatsAppStatus(status: string): string {
  return status.replaceAll('_', ' ').toUpperCase()
}
