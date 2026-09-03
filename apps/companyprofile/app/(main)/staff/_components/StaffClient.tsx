'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import TiltCard from '@/app/components/ui/TiltCard'
import type { Staff } from '@/app/lib/types'

const tabs = [
  { key: 'all', idn: 'Semua' },
  { key: 'leader', idn: 'Pimpinan' },
  { key: 'teacher', idn: 'Guru' },
] as const

export default function StaffClient({ staff }: { staff: Staff[] }) {
  const [filter, setFilter] = useState<'all' | 'leader' | 'teacher'>('all')

  useEffect(() => {
    document.title = 'Guru & Staff | PTDARRAHMAN'
  }, [])

  const filtered = filter === 'all' ? staff : staff.filter((s) => s.role === filter)

  return (
    <>
      <PageHeader
        title="Guru & Staff"
        subtitle="Kenali tim pendidik dan profesional berdedikasi kami yang berkomitmen membentuk pemimpin masa depan"
      />

      <section className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 mb-14">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--accent)]'
                }`}
                aria-label={`Filter ${tab.idn}`}
                aria-pressed={filter === tab.key}
              >
                {tab.idn}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((person) => {
              const p = person.content ?? {}
              return (
                <TiltCard key={person.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 card-hover">
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 border-2 border-[var(--accent)]/20 relative">
                    {person.image ? <Image src={person.image} alt={p.name || ''} fill className="object-cover" sizes="80px" /> : <div className="w-full h-full bg-[var(--bg-secondary)] rounded-full" />}
                  </div>
                  <h3 className="text-base font-bold font-[var(--font-heading)] text-center mb-1">{p.name}</h3>
                  <p className="text-xs text-[var(--accent)] font-medium text-center mb-3">{p.position}</p>
                  <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed mb-4 line-clamp-3">{p.bio}</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {(p.expertise || []).map((exp, j) => (
                      <span key={j} className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">{exp}</span>
                    ))}
                  </div>
                </TiltCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
