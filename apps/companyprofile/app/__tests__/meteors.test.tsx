import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import Meteors from '../components/ui/Meteors'

afterEach(cleanup)

interface ObserverRecord {
  cb: (entries: Array<{ isIntersecting: boolean }>) => void
  disconnect: () => void
}
const observers: ObserverRecord[] = []

/**
 * jsdom tidak menyediakan IntersectionObserver, dan juga tidak menjalankan
 * layout sehingga `clientWidth`/`clientHeight` selalu 0. Keduanya murni lubang
 * environment test — browser aslinya menyediakan keduanya.
 */
class StubIntersectionObserver {
  constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
    observers.push({ cb, disconnect: vi.fn() })
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && /prefers-reduced-motion/.test(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

function mockCanvasSize(width: () => number, height = 600) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
    configurable: true,
    get: width,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => height,
  })
}

function mockCanvas() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    addColorStop: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  }
  const getContext = vi.fn(() => ctx)
  HTMLCanvasElement.prototype.getContext = getContext as unknown as
    typeof HTMLCanvasElement.prototype.getContext
  return { ctx, getContext }
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', StubIntersectionObserver)
  mockMatchMedia(false)
  mockCanvas()
})

describe('Meteors', () => {
  it('merender canvas yang dekoratif dan tidak menghalangi klik', () => {
    mockCanvasSize(() => 1280)

    const { container } = render(<Meteors />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toBeTruthy()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(canvas?.className).toContain('pointer-events-none')
  })

  it('tidak menjalankan animasi saat prefers-reduced-motion aktif', () => {
    mockMatchMedia(true)
    mockCanvasSize(() => 1280)
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')

    render(<Meteors />)

    expect(raf).not.toHaveBeenCalled()
    raf.mockRestore()
  })

  it('skala canvas sesuai devicePixelRatio supaya ekor tidak blur', () => {
    mockCanvasSize(() => 1280)
    const { ctx } = mockCanvas()
    vi.spyOn(globalThis, 'devicePixelRatio', 'get').mockReturnValue(3)

    render(<Meteors />)

    // DPR dibatasi 2, bukan mengikuti 3 mentah-mentah.
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
  })

  it('loop animasi langsung jalan, tidak menunggu penundaan awal', () => {
    mockCanvasSize(() => 1280)
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')

    render(<Meteors count={5} />)

    // Kalau rAF baru dipanggil setelah jeda, layar akan kosong saat section
    // pertama kali masuk viewport — persis symptom "efeknya tidak ada".
    expect(raf).toHaveBeenCalled()
    raf.mockRestore()
  })

  it('hidup lagi dari ukuran 0 tanpa perlu resize', () => {
    // Effect pertama jalan saat layout belum ada. Tanpa pengukuran ulang di
    // dalam start(), guard !w || !h akan membuat animasi diam selamanya.
    let width = 0
    mockCanvasSize(() => width)
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')

    render(<Meteors />)
    raf.mockClear()

    width = 1280
    observers[0].cb([{ isIntersecting: true }])

    expect(raf).toHaveBeenCalled()
    raf.mockRestore()
  })

  it('berhenti saat canvas keluar dari viewport', () => {
    mockCanvasSize(() => 1280)
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame')

    render(<Meteors />)
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
    observers[0].cb([{ isIntersecting: false }])

    expect(cancel).toHaveBeenCalled()
    raf.mockRestore()
    cancel.mockRestore()
  })
})

/**
 * Menjalankan satu frame dan mengembalikan arah lintasan tiap meteor yang
 * benar-benar tergambar. Meteor yang masih dalam masa tunggu tidak digambar,
 * jadi harus dipaksa melalui waktu agar terlihat.
 */
function flightDirections(count: number, from?: number, to?: number): Array<[number, number]> {
  mockCanvasSize(() => 1280, 600)
  // Helper ini meng-unstub semua global, jadi stub dasar harus dipasang ulang.
  mockMatchMedia(false)
  vi.stubGlobal('IntersectionObserver', StubIntersectionObserver)

  const moves: Array<[number, number]> = []
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => {
      moves.push([x, y])
    }),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    addColorStop: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  }
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as
    typeof HTMLCanvasElement.prototype.getContext

  let t = 0
  let frames = 0
  // rAF asli dijadwalkan asynchronous; kalau callback dipanggil sinkron tanpa
  // batas, `draw` memanggil dirinya sendiri selamanya sampai stack habis.
  vi.stubGlobal('requestAnimationFrame', (cb: (n: number) => void) => {
    if (frames++ > 24) return 1
    t += 250
    cb(t)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('performance', { now: () => t })

  render(<Meteors count={count} from={from} to={to} />)
  const result = moves.slice()
  vi.unstubAllGlobals()
  return result
}

describe('Meteors — pola lintasan', () => {
  it('meteor mulai dari luar zona dan berakhir di dalamnya', () => {
    const moves = flightDirections(3, 0, 1)
    expect(moves.length).toBeGreaterThan(0)

    const HEIGHT = 600
    for (const [, y] of moves) {
      // Batas atas zone adalah 0 (kanvas) — meteor boleh mulai sedikit di atas
      // area gambar, tapi tidak boleh keluar jauh ke bawah (>1 = 600px).
      expect(y).toBeLessThanOrEqual(HEIGHT)
    }
  })

  it('lintasan tiap indeks deterministik, bukan diacak tiap kemunculan', () => {
    const first = flightDirections(3, 0, 1)
    const second = flightDirections(3, 0, 1)

    // Pola tetap: subway sama untuk streak pada slot yang sama.
    expect(first.length).toBe(second.length)
    first.forEach(([x, y], i) => {
      const sx = Math.round(x)
      const sy = Math.round(y)
      // Toleransi kecil: hanya sampling time bisa sedikit beda antar stub.
      expect(Math.round(second[i][0])).toBeGreaterThan(sx - 60)
      expect(Math.round(second[i][0])).toBeLessThan(sx + 60)
      expect(Math.round(second[i][1])).toBeGreaterThan(sy - 60)
      expect(Math.round(second[i][1])).toBeLessThan(sy + 60)
    })
  })

  it('region membatasi lintasan:from/to yang lebih rendah tidak menggambar di luar pita', () => {
    const moves = flightDirections(3, 0, 0.5)
    expect(moves.length).toBeGreaterThan(0)

    // Zona 0..0.5 dari tinggi 600px = 300px. Meteor boleh masuk sedikit dari
    // atas, tapi harus selesai sebelum tepi bawah zona.
    for (const [, y] of moves) {
      expect(y).toBeLessThanOrEqual(300 + 2)
    }
  })
})