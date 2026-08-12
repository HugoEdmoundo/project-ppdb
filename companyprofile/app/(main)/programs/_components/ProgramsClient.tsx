'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PageHeader from '@/app/components/layout/PageHeader'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Program } from '@/app/lib/types'
import { BookOpen, Cpu, Globe, Award, ArrowRight, Clock, Layers } from 'lucide-react'
import TiltCard from '@/app/components/ui/TiltCard'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  'language': Globe,
  'users': Award,
}

export default function ProgramsClient({ programs }: { programs: Program[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = 'Program Kami | PTDARRAHMAN'
  }, [])

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  return (
    <>
      <PageHeader
        title="Program Kami"
        subtitle="Program pendidikan komprehensif yang mengintegrasikan keunggulan Al-Quran dengan inovasi digital"
        badge="KEUNGGULAN AKADEMIK"
      />

      <section ref={sectionRef} className="py-16 sm:py-20 md:py-28 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {programs.map((prog) => {
              const info = prog.content ?? {}
              const Icon = iconMap[prog.icon] || BookOpen
              return (
                <TiltCard key={prog.id} className="group">
                  <Link
                    href={`/programs/${prog.slug}`}
                    className="glass-card rounded-2xl overflow-hidden !no-underline block h-full"
                  >
                  <div className="aspect-[16/9] overflow-hidden relative">
                    {prog.image ? <Image src={prog.image} alt={info.title || ''} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 50vw" /> : <div className="w-full h-full bg-[var(--bg-secondary)]" />}
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="verse-strip w-12 mb-5" />
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <h3 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] mb-3">
                      {info.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">{info.desc}</p>
                    <div className="flex items-center gap-4 mb-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {info.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        {info.level}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(info.highlights || []).slice(0, 4).map((h, i) => (
                        <span key={i} className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-medium">{h}</span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] group-hover:gap-2 transition-all">
                      Lihat Detail
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </TiltCard>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
