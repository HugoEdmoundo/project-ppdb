'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import { StaffOrgChart } from '@/app/components/staff/StaffOrgChart'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/app/components/ui/Dialog'
import type { Staff } from '@/app/lib/types'

const tabs = [
  { key: 'all', idn: 'Semua' },
  { key: 'leader', idn: 'Pimpinan' },
  { key: 'teacher', idn: 'Guru' },
] as const

export default function StaffClient({ staff }: { staff: Staff[] }) {
  const [filter, setFilter] = useState<'all' | 'leader' | 'teacher'>('all')
  const [selected, setSelected] = useState<Staff | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'Guru & Staff | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1, targets: 'children' })

  const filtered = filter === 'all' ? staff : staff.filter((s) => s.role === filter)

  return (
    <>
      <PageHeader
        title="Guru & Staff"
        subtitle="Kenali tim pendidik dan profesional berdedikasi kami yang berkomitmen membentuk pemimpin masa depan"
      />

      <section className="py-16 sm:py-20 bg-[var(--bg)]">
        <div ref={sectionRef} className="max-w-7xl mx-auto px-4 sm:px-6">
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

          <StaffOrgChart staff={filtered} onSelect={setSelected} selectedId={selected?.id} />
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <span className="relative block w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--accent)]/20 shrink-0">
                    {selected.image ? (
                      <Image src={selected.image} alt={selected.content?.name || ''} fill className="object-cover" sizes="64px" />
                    ) : (
                      <span className="flex w-full h-full items-center justify-center bg-[var(--bg-secondary)] text-[var(--accent)] font-bold text-xl">
                        {(selected.content?.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div>
                    <DialogTitle>{selected.content?.name}</DialogTitle>
                    <p className="text-sm text-[var(--accent)] font-medium mt-0.5">{selected.content?.position}</p>
                  </div>
                </div>
              </DialogHeader>
              <DialogDescription className="leading-relaxed">
                {selected.content?.bio || 'Belum ada biografi.'}
              </DialogDescription>
              {(selected.content?.expertise ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.content!.expertise!.map((exp, j) => (
                    <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">{exp}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
