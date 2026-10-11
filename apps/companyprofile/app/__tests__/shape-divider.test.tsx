import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import ShapeDivider from '../components/ui/ShapeDivider'
import ShapeDividerDiagonal from '../components/ui/ShapeDividerDiagonal'

afterEach(cleanup)

/**
 * `var()` hanya dijamin resolve di inline style. Kalau `stop-color` dipasang
 * sebagai presentation attribute, beberapa browser tidak mensubstitusi custom
 * property sehingga gradien jatuh ke nilai awal `black` dan gelombang berubah
 * jadi blok gelap. Test ini mengunci pilihan tersebut.
 */
function stopColorOf(stop: Element): string | null {
  return (stop as SVGStopElement).style.stopColor || null
}

function fillOf(path: Element | null): string | null {
  return (path as SVGPathElement | null)?.style.fill || null
}

describe.each([
  ['ShapeDivider', ShapeDivider],
  ['ShapeDividerDiagonal', ShapeDividerDiagonal],
])('%s — gradien', (_name, Divider) => {
  it('merender tiga stop dan path yang mereferensikan gradien yang sama', () => {
    const { container } = render(<Divider />)

    const stops = container.querySelectorAll('stop')
    expect(stops).toHaveLength(3)

    const gradientId = container.querySelector('linearGradient')?.getAttribute('id')
    expect(gradientId).toBeTruthy()

    const path = container.querySelector('path')
    expect(fillOf(path)).toBe(`url(#${gradientId})`)
    expect(path?.hasAttribute('fill')).toBe(false)
  })

  it('memakai inline style untuk stop-color, bukan atribut', () => {
    const { container } = render(<Divider />)

    for (const stop of container.querySelectorAll('stop')) {
      expect(stopColorOf(stop)).toBeTruthy()
      expect(stop.hasAttribute('stop-color')).toBe(false)
    }
  })

  it('id gradien adalah ident CSS yang valid untuk url(#...)', () => {
    const { container } = render(<Divider />)
    const id = container.querySelector('linearGradient')?.getAttribute('id') ?? ''
    // Underscore boleh menjadi karakter pertama ident CSS; yang dilarang adalah
    // diawali angka atau mengandung whitespace/karakter yang menghancurkan
    // `url(#id)`.
    expect(id).toMatch(/^[A-Za-z_][\w-]*$/)
  })

  it('gradien vertikal: warna section sebelumnya di 0%, makin tinted ke bawah', () => {
    const { container } = render(<Divider fill="var(--bg)" tintStrength={0.2} />)
    const stops = [...container.querySelectorAll('stop')]

    expect(stops[0].getAttribute('offset')).toBe('0%')
    expect(stopColorOf(stops[0])).toBe('var(--bg)')

    expect(stops[1].getAttribute('offset')).toBe('45%')
    expect(stopColorOf(stops[1])).toBe(
      'color-mix(in srgb, var(--color-emerald) 12%, var(--bg))',
    )

    expect(stops[2].getAttribute('offset')).toBe('100%')
    expect(stopColorOf(stops[2])).toBe(
      'color-mix(in srgb, var(--color-emerald) 20%, var(--bg))',
    )
  })

  it('gradient id unik antar instance supaya tidak saling menimpa', () => {
    const { container } = render(
      <>
        <Divider />
        <Divider />
      </>,
    )
    const ids = [...container.querySelectorAll('linearGradient')].map((g) =>
      g.getAttribute('id'),
    )
    expect(new Set(ids).size).toBe(2)
  })

  it('clamp tintStrength ke rentang 0–1', () => {
    // Di-clamp ke 1: stop terakhir (mix 100%) tidak boleh lewat 100%.
    const { container: over } = render(<Divider tintStrength={5} />)
    const overStops = over.querySelectorAll('stop')
    expect(stopColorOf(overStops[1])).toContain('60%')
    expect(stopColorOf(overStops[2])).toContain('100%')

    // Di-clamp ke 0: tidak boleh ada persentase negatif.
    const { container: under } = render(<Divider tintStrength={-1} />)
    expect(stopColorOf(under.querySelectorAll('stop')[2])).toContain(' 0%,')
  })

  it('tidak menghalangi klik di section hosting', () => {
    const { container } = render(<Divider />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('pointer-events-none')
  })
})