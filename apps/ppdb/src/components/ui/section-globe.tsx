import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import GlobeLogo from './globe'
import { cn } from '@/lib/utils'

/**
 * Globe yang "mengikuti" section: satu elemen `fixed` yang berpindah posisi &
 * skala mengikuti section yang sedang aktif di layar.
 *
 * Dipisah dari `ScrollGlobe` supaya efeknya bisa dipakai halaman yang susunannya
 * sendiri (mis. landing page PPDB), tanpa ikut membawa progress bar, dot-nav,
 * atau section `min-h-screen` milik halaman demo.
 */

export interface GlobeStop {
  /** `id` elemen section yang dilacak. */
  id: string
  /** Posisi vertikal, persen tinggi viewport. */
  top: string
  /** Posisi horizontal, persen lebar viewport. Diabaikan kalau `leftPx` diisi. */
  left: string
  /**
   * Posisi horizontal dalam px dari titik tengah kolom konten. Karena kolomnya
   * `mx-auto`, titik tengahnya selalu sama dengan titik tengah viewport — jadi
   * jaraknya ke tepi kolom konstan di lebar berapa pun (beda dengan `left`,
   * yang ikut melebar bersama viewport). Dipakai untuk jangkar presisi.
   */
  leftPx?: number
  scale: number
  /** Default `defaultOpacity` kalau tidak diisi. */
  opacity?: number
}

export interface ResolvedGlobeStop extends GlobeStop {
  topNum: number
  leftNum: number
}

export interface UseSectionGlobeOptions {
  /** Sembunyikan globe saat tak ada section yang dekat tengah viewport. */
  fadeOutWhenIdle?: boolean
  /** "Dekat" = jarak pusat section ke tengah viewport, dalam pecahan tinggi viewport. */
  idleThreshold?: number
  mobileBreakpoint?: number
  defaultOpacity?: number
}

export interface UseSectionGlobeResult {
  transform: string
  opacity: number
  activeStop?: ResolvedGlobeStop
  activeIndex: number
}

const parsePercent = (value: string) => parseFloat(value.replace('%', ''))

function resolveStops(stops: GlobeStop[]): ResolvedGlobeStop[] {
  return stops.map((stop) => ({
    ...stop,
    topNum: parsePercent(stop.top),
    leftNum: parsePercent(stop.left),
  }))
}

function buildTransform(stop: ResolvedGlobeStop) {
  const x =
    stop.leftPx !== undefined
      ? `calc(50vw + ${stop.leftPx}px)`
      : `${stop.leftNum}vw`
  return `translate3d(${x}, ${stop.topNum}vh, 0) translate3d(-50%, -50%, 0) scale3d(${stop.scale}, ${stop.scale}, 1)`
}

const FALLBACK_STOP: ResolvedGlobeStop = { id: '', top: '50%', left: '50%', scale: 1, topNum: 50, leftNum: 50 }

interface GlobeState {
  index: number
  inRange: boolean
  mobile: boolean
}

const INITIAL_STATE: GlobeState = { index: -1, inRange: false, mobile: false }

export function useSectionGlobe(
  stops: GlobeStop[],
  mobileStops?: GlobeStop[],
  options: UseSectionGlobeOptions = {},
): UseSectionGlobeResult {
  const {
    fadeOutWhenIdle = true,
    idleThreshold = 0.6,
    mobileBreakpoint = 768,
    defaultOpacity = 0.85,
  } = options

  const desktop = useMemo(() => resolveStops(stops), [stops])
  const mobile = useMemo(() => resolveStops(mobileStops ?? stops), [mobileStops, stops])

  const [state, setState] = useState<GlobeState>(INITIAL_STATE)
  // `state` hanya dibaca untuk render, sedangkan perbandingan "berubah atau tidak"
  // terjadi 60x/detik di dalam ticker. Tanpa gate ini, `setState` dipanggil tiap
  // frame walau nilainya identik.
  const stateRef = useRef<GlobeState>(INITIAL_STATE)

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < mobileBreakpoint
      const activeSet = isMobile ? mobile : desktop
      const viewportCenter = window.innerHeight / 2

      let bestIndex = -1
      let minDistance = Infinity

      activeSet.forEach((stop, index) => {
        const element = document.getElementById(stop.id)
        if (!element) return
        const rect = element.getBoundingClientRect()
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter)
        if (distance < minDistance) {
          minDistance = distance
          bestIndex = index
        }
      })

      const inRange = bestIndex >= 0 && (!fadeOutWhenIdle || minDistance <= window.innerHeight * idleThreshold)

      const previous = stateRef.current
      if (previous.index === bestIndex && previous.inRange === inRange && previous.mobile === isMobile) return

      const next: GlobeState = { index: bestIndex, inRange, mobile: isMobile }
      stateRef.current = next
      setState(next)
    }

    // `gsap.ticker` sudah berjalan sinkron dengan Lenis, jadi globe tidak lagi
    // menambah listener scroll sendiri — ini yang menghilangkan tearing 1 frame.
    update()
    gsap.ticker.add(update)
    return () => {
      gsap.ticker.remove(update)
    }
  }, [desktop, mobile, mobileBreakpoint, idleThreshold, fadeOutWhenIdle])

  const activeSet = state.mobile ? mobile : desktop
  const target = activeSet[state.index] ?? activeSet[0] ?? FALLBACK_STOP

  return {
    transform: buildTransform(target),
    opacity: state.index >= 0 && state.inRange ? (target.opacity ?? defaultOpacity) : 0,
    activeStop: state.index >= 0 ? target : undefined,
    activeIndex: state.index,
  }
}

export interface SectionGlobeProps extends UseSectionGlobeOptions {
  stops: GlobeStop[]
  mobileStops?: GlobeStop[]
  markUrl?: string
  className?: string
  zIndex?: number
}

export function SectionGlobe({
  stops,
  mobileStops,
  markUrl,
  className,
  zIndex = 20,
  ...options
}: SectionGlobeProps) {
  const { transform, opacity } = useSectionGlobe(stops, mobileStops, options)

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed left-0 top-0', className)}
      style={{
        zIndex,
        transform,
        opacity,
        transitionProperty: 'transform, opacity',
        transitionDuration: '1600ms, 400ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.24, 1), ease-out',
        willChange: 'transform, opacity',
      }}
    >
      <GlobeLogo markUrl={markUrl} />
    </div>
  )
}
