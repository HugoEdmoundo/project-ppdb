import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Timeline GSAP sulit diuji tanpa scroll nyata, jadi konfigurasi geraknya
 * dibaca dari source. Ini penaga regresi: nilai-nilai ini yang membuat gerak
 * terasa kasar dan mudah dikembalikan lagi tanpa disadari.
 */
const source = readFileSync(
  resolve(process.cwd(), 'src/components/landing/PortalReveal.tsx'),
  'utf-8',
)
const timelineBlock = source.slice(source.indexOf('const tl ='))

import PortalReveal from './PortalReveal'

afterEach(cleanup)

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

/**
 * Kata kunci dipecah tepat di garis sambungan panel, jadi panjang kedua paruh
 * harus seimbang. `PTDAR | RAHMAN` = 5|5. Yang pernah di navbar adalah
 * `PTD-Arrahman` yang jadi 3|9 kalau dipotong di tengah — timpang, dan karena
 * dua panel bergerak simetris ke ∓100% teksnya juga harus simetris.
 */
function halves(container: HTMLElement) {
  const left = container.querySelector('[data-portal-half-left] [data-portal-wordmark]')
  const right = container.querySelector('[data-portal-half-right] [data-portal-wordmark]')
  return { left: left?.textContent ?? '', right: right?.textContent ?? '' }
}

describe('PortalReveal', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('memecah kata kunci jadi dua paruh seimbang', () => {
    const { container } = render(<PortalReveal />)
    const { left, right } = halves(container)

    expect(left.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
    // Selisih maksimal 1 karakter supaya titik potongnya benar-benar di tengah.
    expect(Math.abs(left.length - right.length)).toBeLessThanOrEqual(1)
  })

  it('menggabungkan dua paruh kembali menjadi satu nama utuh', () => {
    const { container } = render(<PortalReveal />)
    const { left, right } = halves(container)

    expect(left + right).toBe('PTDARRAHMAN')
  })

  it('dua panel menutupi layar dan meet di tengah', () => {
    const { container } = render(<PortalReveal />)
    const panelLeft = container.querySelector('[data-portal-panel-left]')
    const panelRight = container.querySelector('[data-portal-panel-right]')

    expect(panelLeft?.className).toContain('left-0')
    expect(panelLeft?.className).toContain('w-1/2')
    expect(panelRight?.className).toContain('right-0')
    expect(panelRight?.className).toContain('w-1/2')
  })

  it('runway scroll lebih tinggi dari satu viewport supaya ada ruang untuk sticky', () => {
    const { container } = render(<PortalReveal />)
    const section = container.querySelector('section') as HTMLElement

    expect(section.style.height).toMatch(/^\d+vh$/)
    expect(parseInt(section.style.height, 10)).toBeGreaterThan(100)
    expect(container.querySelector('.sticky')).toBeTruthy()
  })

  it('latar punya transform target supaya bisa di-zoom', () => {
    const { container } = render(<PortalReveal />)
    const backdrop = container.querySelector('[data-portal-backdrop]')

    expect(backdrop).toBeTruthy()
    expect(backdrop?.className).toContain('origin-center')
  })

  it('tidak menjalankan GSAP saat prefers-reduced-motion aktif', () => {
    mockMatchMedia(true)
    const tick = vi.spyOn(globalThis, 'requestAnimationFrame')

    render(<PortalReveal />)

    expect(tick).not.toHaveBeenCalled()
    tick.mockRestore()
  })
})

describe('PortalReveal — penempatan konten', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('merender konten DI DALAM portal, di belakang panel', () => {
    // Ini inti efeknya: panel membelah untuk membuka konten hero. Kalau konten
    // diletakkan sebagai section terpisah setelah portal, yang terlihat hanya
    // gradien kosong selama 220vh.
    const { container } = render(
      <PortalReveal>
        <h1 data-testid="hero-content">Daftar Sekarang</h1>
      </PortalReveal>,
    )

    const content = container.querySelector('[data-testid="hero-content"]')
    expect(content).toBeTruthy()

    // Konten harus di frame sticky yang sama dengan panel — bukan sibling
    // di luar portal.
    const frame = container.querySelector('.sticky')
    const panelLeft = container.querySelector('[data-portal-panel-left]')

    expect(frame?.contains(content)).toBe(true)
    expect(frame?.contains(panelLeft)).toBe(true)
  })

  it('layer konten berada di bawah panel dalam urutan z', () => {
    const { container } = render(
      <PortalReveal>
        <h1 data-testid="hero-content">Daftar</h1>
      </PortalReveal>,
    )

    const zOf = (el: Element | null | undefined) => {
      const cls = el?.className ?? ''
      const bracket = cls.match(/z-\[(\d+)\]/)
      if (bracket) return Number(bracket[1])
      const plain = cls.match(/\bz-(\d+)\b/)
      return plain ? Number(plain[1]) : 0
    }

    const layer = container.querySelector('[data-testid="hero-content"]')?.parentElement
    const panel = container.querySelector('[data-portal-panel-left]')

    expect(zOf(layer)).toBeGreaterThan(0)
    expect(zOf(layer)).toBeLessThan(zOf(panel))
  })

  it('portal berada di atas navbar z-50', () => {
    // Navbar di LandingPage masih `fixed z-50`. Tanpa z-index di portal, panel
    // ikut bersaing global dan navbar tetap melayang DI ATAS panel — padahal
    // panel harus menutupi seluruh layar di posisi awal.
    const { container } = render(<PortalReveal />)
    const section = container.querySelector('section') as HTMLElement

    expect(section.className).toContain('z-[60]')
  })

  it('nilai z-index portal benar-benar lebih besar dari 50', () => {
    const { container } = render(<PortalReveal />)
    const section = container.querySelector('section') as HTMLElement
    const match = section.className.match(/z-\[(\d+)\]/)

    expect(match).toBeTruthy()
    expect(Number(match?.[1])).toBeGreaterThan(50)
  })
})

/**
 * Timeline GSAP sulit diuji tanpa scroll nyata, jadi yang diuji di sini adalah
 * sumber angkanya — konstanta dan easing yang jadi penyebab gerak terasa kasar
 * saat review sebelumnya.
 */
describe('PortalReveal — timing', () => {
  it('scrub tidak terlalu jauh di belakang scroll', () => {
    // scrub 0.6 membuat tirai masih meluncur 0.6 detik setelah scroll berhenti.
    const scrub = timelineBlock.match(/scrub:\s*([\d.]+)/)

    expect(scrub).toBeTruthy()
    expect(Number(scrub?.[1])).toBeLessThanOrEqual(0.4)
  })

  it('tidak memakai ease none untuk gerak utama (desinkronisasi antar layer)', () => {
    // ease 'none' untuk latar tapi power2.inOut untuk panel = dua layer
    // bergerak beda kecepatan, dan itu yang terasa kasar.
    expect(timelineBlock).not.toContain("ease: 'none'")
  })

  it('kata kunci di-fade sampai 0, bukan berhenti di 0.25', () => {
    // Di layar sempit paruh yang menempel di tepi menabrak h1 di tengah.
    // Kalau opacity-nya berhenti di 0.25, tabrakan itu tetap terlihat.
    expect(timelineBlock).toContain('{ opacity: 0,')
    expect(timelineBlock).not.toContain('opacity: 0.25')
  })

  it('layer konten punya padding lebih rampuh di mobile agar tidak terpotong', () => {
    // Frame sticky memakai overflow-hidden; di viewport pendek konten yang lebih
    // tinggi akan terpotong, dan yang terpotong adalah tombol "Daftar".
    const { container } = render(<PortalReveal />)
    const layer = container.querySelector('[data-portal-content]')

    expect(layer?.className).toContain('overflow-hidden')
    expect(layer?.className).toContain('pb-14')
  })
})