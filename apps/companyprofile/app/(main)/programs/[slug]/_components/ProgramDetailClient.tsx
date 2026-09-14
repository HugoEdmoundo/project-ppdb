'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useScrollReveal } from '@/app/hooks/useScrollAnimations'
import type { Program } from '@/app/lib/types'
import { Clock, Layers, Check, BookOpen, Cpu, Globe, Award, ArrowRight } from 'lucide-react'

const iconMap: Record<string, typeof BookOpen> = {
  'book-quran': BookOpen,
  'laptop-code': Cpu,
  'language': Globe,
  'users': Award,
}

export default function ProgramDetailClient({ program }: { program: Program }) {
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  useEffect(() => {
    if (program.content) {
      document.title = `${program.content.title || ''} | PTDARRAHMAN`
    }
  }, [program])

  const info = program.content ?? {}
  const Icon = iconMap[program.icon] || BookOpen

  return (
    <>
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          {program.image ? (
            <Image src={program.image} alt={info.title || ''} fill className="object-cover" sizes="100vw" priority />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-secondary)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white/95" />
        </div>
        <div className="absolute top-0 left-0 right-0 verse-strip" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <Icon className="w-7 h-7 text-[var(--accent)]" />
            </div>
            <h1 className="font-[var(--font-display)] text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--text)] leading-[1.05] mb-4 tracking-[-0.03em]">
              {info.title}
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl">{info.tagline}</p>
          </div>
        </div>
      </section>

      <section ref={sectionRef} className="py-16 sm:py-20 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="lg:col-span-2">
              <h2 className="font-[var(--font-display)] text-3xl font-bold mb-6">
                Gambaran Program
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg mb-10">{info.desc}</p>

              <div className="grid sm:grid-cols-2 gap-4 mb-12">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                  <Clock className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Durasi</div>
                    <div className="text-sm font-[var(--font-heading)] font-semibold">{info.duration}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                  <Layers className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Tingkat</div>
                    <div className="text-sm font-[var(--font-heading)] font-semibold">{info.level}</div>
                  </div>
                </div>
              </div>

              <h3 className="font-[var(--font-display)] text-2xl font-bold mb-4">
                Keunggulan Program
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-12">
                {(info.highlights || []).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                    <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-sm">{h}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-[var(--font-display)] text-2xl font-bold mb-4">
                Kurikulum
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-12">
                {(info.curriculum || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                    <span className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm">{c}</span>
                  </div>
                ))}
              </div>

              <h3 className="font-[var(--font-display)] text-2xl font-bold mb-4">
                Hasil Pembelajaran
              </h3>
              <div className="space-y-3">
                {(info.outcomes || []).map((o, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--color-border)]">
                    <Check className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{o}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 glass-card rounded-2xl p-6 space-y-6">
                <div className="text-center">
                  <Icon className="w-12 h-12 text-[var(--accent)] mx-auto mb-3" />
                  <h4 className="font-[var(--font-heading)] font-bold text-lg">{info.title}</h4>
                </div>

                <div className="verse-strip" />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Durasi</span>
                    <span className="font-semibold">{info.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Tingkat</span>
                    <span className="font-semibold">{info.level}</span>
                  </div>
                </div>

                <Link href="/ppdb" className="btn-primary w-full justify-center">
                  Daftar Sekarang
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/contact" className="btn-ghost w-full justify-center">
                  Ajukan Pertanyaan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
