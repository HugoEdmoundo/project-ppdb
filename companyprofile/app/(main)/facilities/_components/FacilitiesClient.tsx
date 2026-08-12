'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Facility } from '@/app/lib/types'
import { ChevronDown, Play } from 'lucide-react'
import TiltCard from '@/app/components/ui/TiltCard'

const categories = [
  { key: 'all', idn: 'Semua' },
  { key: 'academic', idn: 'Akademik' },
  { key: 'worship', idn: 'Ibadah' },
  { key: 'sports', idn: 'Olahraga' },
  { key: 'boarding', idn: 'Asrama' },
  { key: 'tech', idn: 'Teknologi' },
]

export default function FacilitiesClient({ facilities }: { facilities: Facility[] }) {
  const [filter, setFilter] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'Fasilitas Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.08 })

  const filtered = filter === 'all' ? facilities : facilities.filter((f) => f.category === filter)

  return (
    <>
      <PageHeader
        title="Fasilitas Kami"
        subtitle="Fasilitas kelas dunia yang dirancang untuk menginspirasi pembelajaran, kreativitas, dan pertumbuhan spiritual"
        badge="KAMPUS PREMIUM"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === cat.key
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--color-border)] hover:text-[var(--accent)]'
                }`}
                aria-label={`Filter ${cat.idn}`}
                aria-pressed={filter === cat.key}
              >
                {cat.idn}
              </button>
            ))}
          </div>

          {/* Facilities Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {filtered.map((f) => {
              const info = f.content ?? {}
              const isActive = activeId === f.id
              return (
                <TiltCard key={f.id} glare={false} maxTilt={4} className="glass-card rounded-2xl overflow-hidden transition-all cursor-pointer"
                  onClick={() => setActiveId(isActive ? null : f.id)}>
                  <div className="aspect-[16/9] overflow-hidden relative">
                    {f.image ? <Image src={f.image} alt={info.name || ''} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 50vw" loading="lazy" /> : <div className="w-full h-full bg-[var(--bg-secondary)]" />}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-[var(--font-heading)] text-lg font-bold">{info.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{info.desc}</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform flex-shrink-0 mt-1 ${isActive ? 'rotate-180' : ''}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${isActive ? 'max-h-40' : 'max-h-0'}`}>
                      <div className="verse-strip my-4" />
                      <div className="flex flex-wrap gap-2">
                        {(info.features || []).map((feat, j) => (
                          <span key={j} className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">{feat}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TiltCard>
              )
            })}
          </div>

          {/* Virtual Tour */}
          <div className="text-center bg-[var(--bg-secondary)] rounded-2xl p-6 sm:p-8 md:p-12 border border-[var(--color-border)]">
            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Play className="w-6 sm:w-8 h-6 sm:h-8 text-[var(--accent)]" />
            </div>
            <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Tur Pesantren Virtual
            </h3>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-6 sm:mb-8 text-xs sm:text-sm">
              Tidak bisa mengunjungi kami secara langsung? Ikuti tur virtual pesantren kami dari kenyamanan rumah Anda.
            </p>
            <button disabled className="btn-primary mx-auto text-xs sm:text-sm pointer-events-none opacity-60">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Mulai Tur Virtual
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
