import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import GlobeLogo from './globe'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/motion'

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
  /**
   * `true` SATU frame setelah perangkat berubah (mobile ↔ desktop). Dipakai
   * komponen untuk men-snap durasi transisi jadi 0ms pada frame itu, sehingga
   * lompatan posisi karena ganti stop-set tidak "menyeret" globe menyusuri
   * viewport selama 1.6 detik. State aktif tanpa perangkat alias mempertahankan
   * nilai ini sampai terjadi perubahan lain (mis. pindah section) — yang benar:
   * durasi normal hanya berlaku saat transition benar-benar dimulai.
   */
  justSwitched: boolean
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
  justSwitched: boolean
}

const INITIAL_STATE: GlobeState = { index: -1, inRange: false, mobile: false, justSwitched: false }

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

  const [state, setState] = useState<GlobeState>(() => {
    // prefers-reduced-motion: globe diam saja di posisi stop pertama — tidak
    // mengikuti scroll dan tidak ada ticker sama sekali. State di-set di lazy
    // initializer (bukan di dalam effect) supaya tidak ada setState sinkron di
    // body effect; perangkat dicatat sekali di mount.
    if (!prefersReducedMotion()) return INITIAL_STATE
    return {
      index: 0,
      inRange: true,
      mobile: typeof window !== 'undefined' && window.innerWidth < mobileBreakpoint,
      justSwitched: false,
    }
  })
  // `state` hanya dibaca untuk render, sedangkan perbandingan "berubah atau tidak"
  // terjadi 60x/detik di dalam ticker. Tanpa gate ini, `setState` dipanggil tiap
  // frame walau nilainya identik. Di-ref supaya bernilai sama dengan state awal.
  const stateRef = useRef<GlobeState>(state)
  // Handle elemen section di-cache, bukan di-`getElementById` tiap frame.
  // `getBoundingClientRect` tetap dibaca fresh tiap frame (memang diperlukan),
  // tapi query DOM yang mahal cukup sekali per elemen.
  const elementCache = useRef(new Map<string, HTMLElement>())

  const getStopElement = (id: string) => {
    const cached = elementCache.current.get(id)
    if (cached?.isConnected) return cached
    const el = document.getElementById(id)
    if (el) elementCache.current.set(id, el)
    else elementCache.current.delete(id)
    return el
  }

  useEffect(() => {
    // prefers-reduced-motion: globe sudah diam di stop pertama dari state awal,
    // jadi ticker tidak perlu didaftarkan sama sekali.
    if (prefersReducedMotion()) return

    const update = () => {
      const isMobile = window.innerWidth < mobileBreakpoint
      const activeSet = isMobile ? mobile : desktop
      const viewportCenter = window.innerHeight / 2

      let bestIndex = -1
      let minDistance = Infinity

      activeSet.forEach((stop, index) => {
        const element = getStopElement(stop.id)
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

      const next: GlobeState = {
        index: bestIndex,
        inRange,
        mobile: isMobile,
        // `previous.mobile !== isMobile` → perangkat baru saja berganti. Satu
        // frame ini `justSwitched` = true supaya lompatan posisi tidak ditransisi
        // 1.6 detik. Setelahnya false lagi sampai section berpindah.
        justSwitched: previous.mobile !== isMobile,
      }
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
    justSwitched: state.justSwitched,
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
  const { transform, opacity, justSwitched } = useSectionGlobe(stops, mobileStops, options)

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed left-0 top-0', className)}
      style={{
        zIndex,
        transform,
        opacity,
        transitionProperty: 'transform, opacity',
        // Saat perangkat barusan berganti (mobile ↔ desktop), stop target bisa
        // melompat jauh (set posisi berbeda) — `justSwitched` men-snap durasi jadi
        // 0ms pada frame itu supaya globe tidak "terseret" menyusuri viewport.
        transitionDuration: justSwitched ? '0ms, 0ms' : '1600ms, 400ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.24, 1), ease-out',
        willChange: 'transform, opacity',
      }}
    >
      <GlobeLogo markUrl={markUrl} />
    </div>
  )
}
