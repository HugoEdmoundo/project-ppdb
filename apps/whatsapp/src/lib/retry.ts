/**
 * src/lib/retry.ts
 *
 * Retry delay calculator dengan exponential backoff + jitter.
 * Sesuai spesifikasi:
 *   Retry 1: ~5s
 *   Retry 2: ~30s
 *   Retry 3: ~2m
 *   Retry 4: ~15m
 *   Retry 5: ~1h
 *
 * Jitter ±20% untuk menghindari thundering herd.
 */

export interface RetryDelayConfig {
  baseDelays: number[]; // delay base per attempt (ms)
  jitterFactor: number; // 0.0 - 1.0, default 0.2 (±20%)
}

const DEFAULT_CONFIG: RetryDelayConfig = {
  baseDelays: [
    5_000,        // Attempt 1: 5 detik
    30_000,       // Attempt 2: 30 detik
    120_000,      // Attempt 3: 2 menit
    900_000,      // Attempt 4: 15 menit
    3_600_000,    // Attempt 5: 1 jam
  ],
  jitterFactor: 0.2,
};

/**
 * Hitung delay untuk attempt ke-N (1-indexed).
 * Menambahkan jitter acak ±jitterFactor%.
 *
 * @param attempt - Attempt number (1-indexed)
 * @param config  - Custom config (optional)
 * @returns delay in milliseconds
 */
export function getRetryDelay(
  attempt: number,
  config: RetryDelayConfig = DEFAULT_CONFIG
): number {
  const index = Math.min(attempt - 1, config.baseDelays.length - 1);
  const base = config.baseDelays[index]!;
  const jitter = base * config.jitterFactor * (Math.random() * 2 - 1); // -20% ~ +20%
  return Math.max(1000, Math.round(base + jitter));
}

/**
 * Rate limit delay — minimal 30-60 detik setelah rate limit hit.
 */
export function getRateLimitDelay(): number {
  return 30_000 + Math.round(Math.random() * 30_000); // 30-60s
}

/**
 * BullMQ backoff strategy yang kompatibel dengan job.opts.backoff.
 * Digunakan sebagai custom backoff di Queue options.
 */
export function bullMQBackoffStrategy(
  attemptsMade: number,
  _type: string,
  _err: Error,
  _job: unknown
): number {
  return getRetryDelay(attemptsMade);
}

export const MAX_RETRY_ATTEMPTS = 5;

/**
 * Error types yang TIDAK boleh di-retry.
 */
export const NON_RETRYABLE_ERRORS = [
  "invalid_number",
  "not_on_whatsapp",
  "blocked",
];

export function isRetryable(errorCode?: string): boolean {
  if (!errorCode) return true;
  return !NON_RETRYABLE_ERRORS.includes(errorCode);
}
