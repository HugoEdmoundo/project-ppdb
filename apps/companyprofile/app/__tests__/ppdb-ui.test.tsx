import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

import PpdbCountdown from '../components/ui/PpdbCountdown'
import { buildSchedule, type ActivePpdbWave } from '../lib/ppdb'

afterEach(cleanup)

const WAVE: ActivePpdbWave = {
  active: true,
  name: 'Gelombang 1',
  academic_year: '2027/2028',
  quota: 150,
  registration_start_date: '2099-01-01',
  registration_end_date: '2099-12-31',
}

describe('PpdbCountdown — wave aktif', () => {
  it('menampilkan dua blok: dibuka & batas akhir', () => {
    render(<PpdbCountdown wave={WAVE} />)
    expect(screen.getByText('Pendaftaran dibuka')).toBeTruthy()
    expect(screen.getByText('Batas akhir pendaftaran')).toBeTruthy()
  })

  it('menampilkan satuan waktu sesuai tier', async () => {
    const { container } = render(<PpdbCountdown wave={WAVE} />)
    // Hitung pertama jalan lewat setTimeout(..., 0) -> tunggu tick-nya.
    await waitFor(() => expect(container.textContent).toContain('Bulan'))
    const units = [...container.querySelectorAll('div > div:last-child')]
      .map((s) => s.textContent?.trim())
      .filter((t): t is string => !!t && /^[A-Z][a-z]+$/.test(t))
    expect(units).toContain('Bulan')
    expect(units).toContain('Hari')
    // Jauh (> 2 bulan) -> tidak ada jam/menit/detik
    expect(units).not.toContain('Detik')
    expect(units).not.toContain('Jam')
  })
})

describe('PpdbCountdown — tidak ada wave aktif', () => {
  it('tidak merender apa pun saat wave = null', () => {
    const { container } = render(<PpdbCountdown wave={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('tidak merender apa pun saat active = false', () => {
    const { container } = render(<PpdbCountdown wave={{ active: false } as ActivePpdbWave} />)
    expect(container.innerHTML).toBe('')
  })

  it('tidak merender apa pun saat tanggal kosong', () => {
    const { container } = render(
      <PpdbCountdown wave={{ active: true, name: 'X' } as ActivePpdbWave} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('hanya satu blok yang punya tanggal -> hanya itu yang dirender', () => {
    render(
      <PpdbCountdown
        wave={{ active: true, name: 'X', registration_start_date: '2099-01-01' } as ActivePpdbWave}
      />
    )
    expect(screen.getByText('Pendaftaran dibuka')).toBeTruthy()
    expect(screen.queryByText('Batas akhir pendaftaran')).toBeNull()
  })
})

describe('PpdbCountdown — tanggal sudah lewat', () => {
  it('menampilkan status "sedang berlangsung", bukan angka negatif', async () => {
    const { container } = render(
      <PpdbCountdown
        wave={{
          active: true,
          name: 'X',
          registration_start_date: '2000-01-01',
          registration_end_date: '2000-12-31',
        } as ActivePpdbWave}
      />
    )
    await waitFor(() => expect(container.textContent).toMatch(/Sedang berlangsung/i))
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/-\d/)
  })
})

describe('buildSchedule — tidak ada wave', () => {
  it('semua field null supaya tidak ada angka karangan di UI', () => {
    const s = buildSchedule(null)
    expect(s).toEqual({
      academicYear: null,
      waveName: null,
      quota: null,
      start: null,
      end: null,
      selection: null,
      documentDeadline: null,
    })
  })
})
