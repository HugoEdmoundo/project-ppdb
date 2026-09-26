import { describe, it, expect } from 'vitest'

import {
  getCountdownParts,
  needsSecondTick,
  parseApiDate,
  formatTanggalIndo,
  buildSchedule,
  type ActivePpdbWave,
} from '../lib/ppdb'

const HARI = 24 * 60 * 60 * 1000
const JAM = 60 * 60 * 1000
const MENIT = 60 * 1000

//NOW tetap, supaya pengujian tidak flaky.
const NOW = new Date(2026, 0, 15, 10, 0, 0).getTime()

function partsIn(ms: number) {
  return getCountdownParts(new Date(NOW + ms), NOW)
}

describe('parseApiDate', () => {
  it('parse tanggal API sebagai tengah malam waktu lokal, bukan UTC', () => {
    const d = parseApiDate('2027-04-01')!
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(3)
    expect(d.getDate()).toBe(1)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('tidak bergeserzon (tidak 07:00 seperti new Date() UTC)', () => {
    // new Date('2027-04-01') di-parse sebagai UTC -> 07:00 di WIB.
    expect(new Date('2027-04-01').getHours()).not.toBe(0)
    expect(parseApiDate('2027-04-01')!.getHours()).toBe(0)
  })

  it('kembalikan null untuk input kosong / rusak', () => {
    expect(parseApiDate(null)).toBeNull()
    expect(parseApiDate(undefined)).toBeNull()
    expect(parseApiDate('')).toBeNull()
  })
})

describe('getCountdownParts — tier >= 2 bulan', () => {
  it('tampilkan bulan + hari, TANPA jam/menit/detik', () => {
    const p = partsIn(100 * HARI)!
    expect(p.months).toBe(3)
    expect(p.days).toBe(10)
    expect(p.hours).toBeNull()
    expect(p.minutes).toBeNull()
    expect(p.seconds).toBeNull()
  })

  it('tepat 2 bulan memakai tier bulan', () => {
    const p = partsIn(60 * HARI)!
    expect(p.months).toBe(2)
    expect(p.days).toBe(0)
    expect(p.seconds).toBeNull()
  })

  it('tidak perlu tick tiap detik di tier ini', () => {
    expect(needsSecondTick(new Date(NOW + 100 * HARI), NOW)).toBe(false)
  })
})

describe('getCountdownParts — tier 4 hari s/d 2 bulan', () => {
  it('tampilkan hari + jam + menit, TANPA detik', () => {
    const p = partsIn(30 * HARI + 5 * JAM + 7 * MENIT)!
    expect(p.months).toBeNull()
    expect(p.days).toBe(30)
    expect(p.hours).toBe(5)
    expect(p.minutes).toBe(7)
    expect(p.seconds).toBeNull()
  })

  it('tepat di atas 4 hari belum pakai detik', () => {
    const p = partsIn(4 * HARI + 1)!
    expect(p.seconds).toBeNull()
  })

  it('tidak perlu tick tiap detik', () => {
    expect(needsSecondTick(new Date(NOW + 30 * HARI), NOW)).toBe(false)
  })
})

describe('getCountdownParts — tier <= 4 hari', () => {
  it('tampilkan hari + jam + menit + detik', () => {
    const p = partsIn(3 * HARI + 2 * JAM + 3 * MENIT + 4000)!
    expect(p.days).toBe(3)
    expect(p.hours).toBe(2)
    expect(p.minutes).toBe(3)
    expect(p.seconds).toBe(4)
  })

  it('tepat 4 hari sudah pakai detik', () => {
    expect(partsIn(4 * HARI)!.seconds).not.toBeNull()
  })

  it('butuh tick tiap detik', () => {
    expect(needsSecondTick(new Date(NOW + 3 * HARI), NOW)).toBe(true)
  })

  it('detik benar-benar berjalan (turun 1 tiap detik)', () => {
    const t = new Date(NOW + 10 * MENIT + 9000)
    const a = getCountdownParts(t, NOW)!
    const b = getCountdownParts(t, NOW + 1000)!
    expect(a.seconds).toBe(9)
    expect(b.seconds).toBe(8)
  })
})

describe('getCountdownParts — batas', () => {
  it('target sudah lewat -> null', () => {
    expect(partsIn(0)).toBeNull()
    expect(partsIn(-1)).toBeNull()
    expect(partsIn(-100 * HARI)).toBeNull()
  })

  it('1 ms sebelum selesai -> bukan null', () => {
    expect(partsIn(1)).not.toBeNull()
  })
})

describe('formatTanggalIndo', () => {
  it('format Indonesia', () => {
    expect(formatTanggalIndo(parseApiDate('2027-04-01'))).toBe('1 April 2027')
    expect(formatTanggalIndo(parseApiDate('2027-12-31'))).toBe('31 Desember 2027')
  })

  it('null untuk tanggal kosong', () => {
    expect(formatTanggalIndo(null)).toBeNull()
  })
})

describe('buildSchedule', () => {
  const wave: ActivePpdbWave = {
    active: true,
    name: 'Gelombang 1',
    academic_year: '2027/2028',
    quota: 150,
    registration_start_date: '2027-04-01',
    registration_end_date: '2027-05-31',
    selection_date: '2027-06-15',
    document_upload_end_date: '2027-06-10',
  }

  it('baca academic_year dari periode', () => {
    expect(buildSchedule(wave).academicYear).toBe('2027/2028')
  })

  it('baca kuota & tanggal', () => {
    const s = buildSchedule(wave)
    expect(s.quota).toBe(150)
    expect(formatTanggalIndo(s.start)).toBe('1 April 2027')
    expect(formatTanggalIndo(s.end)).toBe('31 Mei 2027')
    expect(formatTanggalIndo(s.selection)).toBe('15 Juni 2027')
    expect(formatTanggalIndo(s.documentDeadline)).toBe('10 Juni 2027')
  })

  it('tanpa wave -> semua null (tidak ada angka karangan)', () => {
    const s = buildSchedule(null)
    expect(s.academicYear).toBeNull()
    expect(s.quota).toBeNull()
    expect(s.start).toBeNull()
  })

  it('kuota 0 dianggap tidak diisi (jangan tampil "0 peserta")', () => {
    expect(buildSchedule({ active: true, quota: 0 }).quota).toBeNull()
  })

  it('academic_year kosong -> null, bukan string kosong', () => {
    expect(buildSchedule({ active: true, academic_year: '' }).academicYear).toBeNull()
  })
})
