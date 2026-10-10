import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import { ShapeDivider, ShapeDividerDiagonal } from './shape-divider'
import { Meteors } from './meteors'

afterEach(cleanup)

function stopColorOf(stop: Element): string | null {
  return (stop as SVGStopElement).style.stopColor || null
}

function fillOf(path: Element | null): string | null {
  return (path as SVGPathElement | null)?.style.fill || null
}

describe.each([
  ['ShapeDivider', ShapeDivider, 137],
  ['ShapeDividerDiagonal', ShapeDividerDiagonal, 58],
])('%s', (_name, Divider, height) => {
  it('merender tiga stop dan path yang mereferensikan gradien yang sama', () => {
    const { container } = render(<Divider />)

    expect(container.querySelectorAll('stop')).toHaveLength(3)

    const gradientId = container.querySelector('linearGradient')?.getAttribute('id')
    expect(gradientId).toBeTruthy()

    const path = container.querySelector('path')
    expect(fillOf(path)).toBe(`url(#${gradientId})`)
    expect(path?.hasAttribute('fill')).toBe(false)
  })

  it('memakai inline style untuk stop-color, bukan atribut', () => {
    // var() di presentation attribute tidak seragam antar browser; inline
    // style pasti resolve.
    const { container } = render(<Divider />)
    for (const stop of container.querySelectorAll('stop')) {
      expect(stopColorOf(stop)).toBeTruthy()
      expect(stop.hasAttribute('stop-color')).toBe(false)
    }
  })

  it('id gradien adalah ident CSS yang valid untuk url(#...)', () => {
    const { container } = render(<Divider />)
    const id = container.querySelector('linearGradient')?.getAttribute('id') ?? ''
    // Underscore boleh jadi karakter pertama ident CSS.
    expect(id).toMatch(/^[A-Za-z_][\w-]*$/)
  })

  it('gradien vertikal, mulai dari warna section sebelumnya lalu makin tinted', () => {
    const { container } = render(<Divider fill="var(--bg)" tintStrength={0.2} />)
    const stops = [...container.querySelectorAll('stop')]

    expect(stopColorOf(stops[0])).toBe('var(--bg)')
    expect(stopColorOf(stops[1])).toBe(
      'color-mix(in srgb, var(--color-emerald) 12%, var(--bg))',
    )
    expect(stopColorOf(stops[2])).toBe(
      'color-mix(in srgb, var(--color-emerald) 20%, var(--bg))',
    )
  })

  it('gradient id unik antar instance', () => {
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

  it('clamp tintStrength ke rentang 0-1', () => {
    const { container: over } = render(<Divider tintStrength={5} />)
    const overStops = over.querySelectorAll('stop')
    expect(stopColorOf(overStops[1])).toContain('60%')
    expect(stopColorOf(overStops[2])).toContain('100%')

    const { container: under } = render(<Divider tintStrength={-1} />)
    expect(stopColorOf(under.querySelectorAll('stop')[2])).toContain(' 0%,')
  })

  it('tinggi sesuai bentuk dan tidak menghalangi klik', () => {
    const { container } = render(<Divider />)
    const wrapper = container.firstElementChild
    expect(wrapper?.className).toContain('pointer-events-none')
    expect(container.querySelector('svg')?.getAttribute('class')).toContain(
      `h-[${height}px]`,
    )
  })
})

describe('Meteors', () => {
  it('meresan meteor yang memakai kelas animasi yang benar', () => {
    // animate-meteor-effect sebelumnya tidak pernah ada di index.css, jadi
    // komponen ini tidak bergerak sama sekali.
    const { container } = render(<Meteors number={6} />)
    const spans = container.querySelectorAll('span.animate-meteor-effect')

    expect(spans).toHaveLength(6)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  it('memberi delay dan duration berbeda agar tidak jatuh berbaris', () => {
    const { container } = render(<Meteors number={8} />)
    const delays = [...container.querySelectorAll('span')].map(
      (s) => (s as HTMLElement).style.animationDelay,
    )

    expect(new Set(delays).size).toBeGreaterThan(1)
  })
})