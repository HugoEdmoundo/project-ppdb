/**
 * Sumber data PPDB untuk halaman marketing.
 *
 * Semua angka PPDB (tahun ajaran, tanggal buka/tutup, kuota) diambil dari
 * endpoint publik `GET /ppdb/waves/active-public` — jadi admin cukup mengubah
 * data di PPDB Dashboard, situs ini ikut menyesuaikan. Tidak ada lagi tanggal
 * atau tahun ajaran yang diketik manual.
 */

const PPDB_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export interface ActivePpdbWave {
  active: boolean
  id?: string
  name?: string
  period_id?: string
  period_name?: string | null
  /**Dari `ppdb_periods.academic_year`, mis. "2027/2028". */
  academic_year?: string | null
  quota?: number
  registration_start_date?: string | null
  registration_end_date?: string | null
  document_upload_end_date?: string | null
  selection_date?: string | null
  allowed_paths?: string[]
  allowed_levels?: string[]
}

/** Gelombang aktif, atau `null` bila belum ada / API tidak terjangkau. */
export async function fetchActivePpdbWave(): Promise<ActivePpdbWave | null> {
  try {
    // `next` diabaikan browser, dipakai Next.js untuk cache server-side.
    const res = await fetch(`${PPDB_API_BASE}/ppdb/waves/active-public`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as ActivePpdbWave
    return data?.active ? data : null
  } catch {
    return null
  }
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Parse tanggal API (`"2027-04-01"`) sebagai **tengah malam waktu lokal**.
 *
 * Penting: `new Date('2027-04-01')` di-parse sebagai UTC, sehingga di WIB
 * (= UTC+7) hasilnya 07.00 dan countdown berakhir 7 jam terlalu lama.
 */
export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "1 April 2027" */
export function formatTanggalIndo(date: Date | null): string | null {
  if (!date) return null
  return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`
}

// ── Hitung mundur ──────────────────────────────────────────

const DETIK = 1000
const MENIT = 60 * DETIK
const JAM = 60 * MENIT
const HARI = 24 * JAM
/** Bulan dihitung 30 hari agar stabil & mudah diuji (bukan kalender). */
const BULAN_DURASI = 30 * HARI

/** Di bawah/sama ini baru tampil hitungan detik. */
const SECONDS_THRESHOLD = 4 * HARI
/** Di atas/sama ini baru tampil bulan, detik disembunyikan. */
const MONTHS_THRESHOLD = 2 * BULAN_DURASI

export interface CountdownParts {
  months: number | null
  days: number | null
  hours: number | null
  minutes: number | null
  seconds: number | null
}

/**
 * Sisa waktu dipecah sesuai jarak, supaya tidak menampilkan detik yang
 * tidak berguna saat masih jauh:
 *
 * - `>= 2 bulan`  → Bulan + Hari
 * - `4 hari < x < 2 bulan` → Hari + Jam + Menit
 * - `<= 4 hari`  → Hari + Jam + Menit + Detik
 *
 * Mengembalikan `null` bila target sudah terlewat.
 */
export function getCountdownParts(target: Date, now: number): CountdownParts | null {
  const diff = target.getTime() - now
  if (diff <= 0) return null

  if (diff >= MONTHS_THRESHOLD) {
    const months = Math.floor(diff / BULAN_DURASI)
    return {
      months,
      days: Math.floor((diff - months * BULAN_DURASI) / HARI),
      hours: null,
      minutes: null,
      seconds: null,
    }
  }

  const withSeconds: CountdownParts = {
    months: null,
    days: Math.floor(diff / HARI),
    hours: Math.floor((diff % HARI) / JAM),
    minutes: Math.floor((diff % JAM) / MENIT),
    // Detik hanya dihitung saat sudah <= 4 hari supaya tidak "berdetak sia-sia".
    seconds: diff <= SECONDS_THRESHOLD ? Math.floor((diff % MENIT) / DETIK) : null,
  }
  return withSeconds
}

/** True kalau tier countdown sedang menampilkan detik (butuh tick 1 detik). */
export function needsSecondTick(target: Date, now: number): boolean {
  const diff = target.getTime() - now
  return diff > 0 && diff <= SECONDS_THRESHOLD
}

/** Ringkasan jadwal PPDB untuk teks marketing/FAQ. */
export interface PpdbSchedule {
  academicYear: string | null
  waveName: string | null
  quota: number | null
  start: Date | null
  end: Date | null
  selection: Date | null
  documentDeadline: Date | null
}

export function buildSchedule(wave: ActivePpdbWave | null): PpdbSchedule {
  return {
    academicYear: wave?.academic_year || null,
    waveName: wave?.name || null,
    quota: wave?.quota && wave.quota > 0 ? wave.quota : null,
    start: parseApiDate(wave?.registration_start_date),
    end: parseApiDate(wave?.registration_end_date),
    selection: parseApiDate(wave?.selection_date),
    documentDeadline: parseApiDate(wave?.document_upload_end_date),
  }
}
