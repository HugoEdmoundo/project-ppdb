'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/app/lib/gsap'
import { prefersReducedMotion } from '@/app/lib/motion'

const STATS = [
  { value: 350, suffix: '+', label: 'Santri Aktif' },
  { value: 40, suffix: '+', label: 'Guru & Staff' },
  { value: 30, suffix: ' Juz', label: 'Hafalan Al-Quran' },
  { value: 15, suffix: '+', label: 'Ekstrakurikuler' },
]

export default function StatsSection({ settings = {} }: { settings?: Record<string, string> }) {
  const displayStats = [
    { value: Number(settings.stat_students) || 350, suffix: '+', label: 'Santri Aktif' },
    { value: Number(settings.stat_teachers || settings.stat_staff) || 40, suffix: '+', label: 'Guru & Staff' },
    { value: Number(settings.stat_juz) || 30, suffix: ' Juz', label: 'Hafalan Al-Quran' },
    { value: Number(settings.stat_extracurricular) || 15, suffix: '+', label: 'Ekstrakurikuler' },
  ]
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-stat]').forEach((el) => {
        const target = Number(el.dataset.stat ?? '0')
        const obj = { n: 0 }
        gsap.to(obj, {
          n: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => { el.textContent = String(Math.round(obj.n)) },
        })
      })
      const cards = root.querySelectorAll('[data-card]')
      gsap.fromTo(cards, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={rootRef} className="py-16 sm:py-20 bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayStats.map((s) => (
            <div key={s.label} data-card className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
              <p className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--accent)] tracking-tight">
                <span data-stat={s.value}>0</span>{s.suffix}
              </p>
              <p className="mt-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
