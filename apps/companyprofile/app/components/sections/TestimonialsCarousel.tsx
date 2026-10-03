'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import {
  motion,
  AnimatePresence,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from 'framer-motion'
import { Quote, ArrowUpRight } from 'lucide-react'
import type { Testimonial } from '@/app/lib/types'

const CARD_GAP = 24
const DURATION_PER_ITEM_SECONDS = 3

function sortByOrder(items: Testimonial[]): Testimonial[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function TestimonialCard({
  t,
  active,
  dimmed,
  onSelect,
}: {
  t: Testimonial
  active: boolean
  dimmed: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      animate={{
        scale: active ? 1.05 : 1,
        y: active ? 0 : 0,
        opacity: dimmed ? 0.65 : 1,
      }}
      whileHover={{ scale: active ? 1.08 : 1.05, y: -10 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      aria-expanded={active}
      aria-label={`Lihat testimoni ${t.name || 'wali santri'}`}
      className="relative overflow-hidden text-left cursor-pointer flex-shrink-0 w-[82vw] sm:w-[360px] h-[420px] sm:h-[460px] rounded-[24px] outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/50"
      style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}
    >
      {t.image ? (
        <Image
          src={t.image}
          alt={t.name || 'Testimoni wali santri'}
          fill
          sizes="(max-width: 640px) 82vw, 360px"
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--color-deep-navy)] flex items-center justify-center">
          <span className="font-[var(--font-heading)] font-bold text-6xl text-white/80">
            {t.name?.charAt(0) || '?'}
          </span>
        </div>
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.82) 100%)' }}
      />

      {/* Active ring */}
      <div
        className="absolute inset-0 rounded-[24px] pointer-events-none"
        style={{
          border: active ? '2px solid var(--accent-gold)' : '2px solid transparent',
          boxShadow: active
            ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 0 0 4px rgba(255, 190, 60, 0.18), 0 12px 40px rgba(0, 0, 0, 0.45)'
            : 'none',
        }}
      />

      {/* Text content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-1.5">
        {t.child && (
          <span
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-gold)]"
            style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)' }}
          >
            {t.child}
          </span>
        )}
        <h3
          className="font-[var(--font-display)] text-xl sm:text-2xl font-semibold text-white leading-tight"
          style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.45)' }}
        >
          {t.name}
        </h3>
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-white/80">
          {'Lihat testimoni'}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.button>
  )
}

export default function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const startedRef = useRef(false)
  const setWidthRef = useRef(0)
  const visibleRef = useRef(true)
  const reduced = useReducedMotion()

  const items = useMemo(() => sortByOrder(testimonials), [testimonials])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((t) => t.id === selectedId) ?? items[0] ?? null

  const translateX = useMotionValue(0)

  // Pause rAF loop saat section di luar viewport supaya tidak menghabiskan CPU.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
      },
      { threshold: 0 },
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  useAnimationFrame((_, delta) => {
    const track = trackRef.current
    if (!track || !startedRef.current) return
    if (pausedRef.current || reduced || !visibleRef.current) return
    const distance = setWidthRef.current
    if (distance <= 0) return
    // Pace matching the reference: one full loop (a single copy of the set)
    // after (items.length * DURATION_PER_ITEM_SECONDS) seconds.
    const pxPerMs = distance / (items.length * DURATION_PER_ITEM_SECONDS * 1000)
    let next = translateX.get() - pxPerMs * delta
    if (next <= -distance) next += distance
    translateX.set(next)
  })

  // Measure one full set (distance between the two copies of the first card)
  // once layout is ready; re-measure jika jumlah item berubah ATAU viewport di-resize
  // (kartu memakai `w-[82vw]`, jadi lebar track ikut viewport).
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current
      if (!track || track.children.length === 0) return
      const first = track.children[0] as HTMLElement | undefined
      const second = track.children[items.length] as HTMLElement | undefined
      if (first && second) {
        setWidthRef.current = second.getBoundingClientRect().left - first.getBoundingClientRect().left
        startedRef.current = setWidthRef.current > 0
      }
    }
    measure()
    const t = window.setTimeout(measure, 300)
    let debounce: ReturnType<typeof setTimeout> | null = null
    let raf = 0
    const onResize = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        raf = requestAnimationFrame(measure)
      }, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', onResize)
      if (debounce) clearTimeout(debounce)
      cancelAnimationFrame(raf)
    }
  }, [items.length])

  const header = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 sm:mb-14 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <span className="section-badge justify-center">{'TESTIMONI'}</span>
        <h2 className="section-title">{'Suara Keunggulan'}</h2>
      </motion.div>
    </div>
  )

  if (items.length === 0) {
    return (
      <section ref={sectionRef} className="relative py-16 md:py-32 bg-[var(--bg-secondary)] overflow-hidden">
        <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
        {header}
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <p className="text-sm text-[var(--text-secondary)]">
            {'Belum ada testimoni yang ditambahkan. Kelola melalui menu Admin &rsaquo; Testimoni.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="relative py-16 md:py-32 bg-[var(--bg-secondary)] overflow-hidden">
      <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
      {header}

      {/* Carousel */}
      <div
        className="relative z-10 w-full overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        onFocus={() => { pausedRef.current = true }}
        onBlur={() => { pausedRef.current = false }}
      >
        {/* Edge fade overlays */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-[120px]"
          style={{ background: 'linear-gradient(90deg, var(--bg-secondary) 0%, transparent 100%)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-[120px]"
          style={{ background: 'linear-gradient(270deg, var(--bg-secondary) 0%, transparent 100%)' }}
        />

        {/* Scrolling track: content duplicated twice for a seamless loop */}
        <motion.div
          ref={trackRef}
          className="flex items-center py-8"
          style={{ gap: CARD_GAP, width: 'max-content', x: translateX }}
        >
          {[...items, ...items].map((t, i) => (
            <TestimonialCard
              key={`${t.id}-${i}`}
              t={t}
              active={selected?.id === t.id}
              dimmed={selected !== null && selected.id !== t.id}
              onSelect={() => setSelectedId(t.id)}
            />
          ))}
        </motion.div>
      </div>

      {/* Selected testimonial detail */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 relative z-10">
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              className="glass-card rounded-2xl p-6 sm:p-10 text-center"
            >
              <Quote className="w-8 h-8 text-[var(--accent)] opacity-20 mx-auto mb-4" />
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-6 italic max-w-2xl mx-auto">
                &ldquo;{(selected.content?.quote || selected.content?.text || '—')}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[var(--accent)]/20 flex-shrink-0 relative">
                  {selected.image ? (
                    <Image src={selected.image} alt={selected.name || ''} width={44} height={44} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-[var(--accent)]/15 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                      {selected.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-[var(--font-heading)] font-bold text-sm">{selected.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{selected.child}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}