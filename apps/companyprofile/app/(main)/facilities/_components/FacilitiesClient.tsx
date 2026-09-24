'use client'

import { useState, useRef, useEffect } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Facility } from '@/app/lib/types'
import { Play } from 'lucide-react'
import InteractiveImageAccordion from '@/app/components/ui/InteractiveImageAccordion'
import EmptyState from '@/app/components/ui/EmptyState'

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

          {/* Facilities Accordion */}
          <div className="mb-16">
            {filtered.length > 0 ? (
              <InteractiveImageAccordion
                key={filter}
                items={filtered.map((f) => ({
                  id: f.id,
                  title: f.content?.name ?? 'Fasilitas',
                  description: f.content?.desc,
                  features: f.content?.features,
                  image: f.image,
                }))}
              />
            ) : (
              <EmptyState
                title="Belum ada fasilitas di kategori ini"
                description="Fasilitas pada kategori tersebut belum tersedia. Silakan pilih kategori lain."
              />
            )}
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
