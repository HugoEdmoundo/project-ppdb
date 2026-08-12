'use client'

import { useRef, useEffect } from 'react'
import type { Achievement } from '@/app/lib/types'

export default function AchievementTimeline({ achievements }: { achievements: Achievement[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  const sorted = [...achievements].sort((a, b) => b.year - a.year)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)

        const items = section.querySelectorAll('.timeline-item')
        gsap.fromTo(items,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out',
            scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' } }
        )
      })
    })

  }, [])

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="section-badge justify-center">
            {'TONGGAK PRESTASI'}
          </span>
          <h2 className="section-title">
            {'Perjalanan Keunggulan Kami'}
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--color-emerald)] via-[var(--color-gold)] to-[var(--color-emerald)] opacity-20" />

          <div className="space-y-8">
            {sorted.map((a) => {
              const info = a.content ?? {}
              const scopeColors: Record<string, string> = {
                International: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                National: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                Provincial: 'bg-green-500/10 text-green-500 border-green-500/20',
              }
              return (
                <div key={a.id} className="timeline-item flex gap-6 items-start">
                  {/* Dot */}
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] bg-[var(--bg)] flex items-center justify-center z-10 relative">
                      <span className="text-[10px] font-bold text-[var(--accent)]">{a.year.toString().slice(-2)}</span>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 glass-card rounded-xl p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--accent)]">{a.year}</span>
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border font-medium ${(info.scope && scopeColors[info.scope]) || 'bg-gray-500/10 text-gray-500'}`}>
                        {info.scope}
                      </span>
                    </div>
                    <h3 className="font-[var(--font-heading)] text-sm font-bold mb-1">{info.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{info.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
