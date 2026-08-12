'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Achievement } from '@/app/lib/types'
import { Award } from 'lucide-react'

export default function AchievementsClient({ achievements }: { achievements: Achievement[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')

  useEffect(() => {
    document.title = 'Prestasi | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.08 })

  const years = Array.from(new Set(achievements.map((a) => a.year))).sort((a, b) => b - a)
  const sorted = [...achievements].sort((a, b) => b.year - a.year)
  const filtered = yearFilter === 'all' ? sorted : sorted.filter((a) => a.year === yearFilter)

  return (
    <>
      <PageHeader
        title="Prestasi"
        subtitle="Perjalanan prestasi santri Ar-Rahman di tingkat provinsi, nasional, dan internasional"
        badge="TONGGAK PRESTASI"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Year Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <button
              onClick={() => setYearFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                yearFilter === 'all'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--accent)]'
              }`}
            >
              Semua Tahun
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setYearFilter(year)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  yearFilter === year
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--accent)]'
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Achievements Grid */}
          {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a) => {
              const info = a.content ?? {}
              const scopeColors: Record<string, string> = {
                International: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                National: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                Provincial: 'bg-green-500/10 text-green-500 border-green-500/20',
              }
              return (
                <div key={a.id} className="glass-card rounded-2xl overflow-hidden group">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {a.image ? <Image src={a.image} alt={info.title || ''} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" loading="lazy" /> : <div className="w-full h-full bg-[var(--bg-secondary)]" />}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-[var(--accent)] text-white shadow-sm">
                        {a.year}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border font-medium ${(info.scope && scopeColors[info.scope]) || 'bg-gray-500/10 text-gray-500'}`}>
                        {info.scope}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-[var(--font-heading)] text-base font-bold text-[var(--text)] mb-2 leading-snug">{info.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{info.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Belum ada prestasi untuk tahun ini.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
