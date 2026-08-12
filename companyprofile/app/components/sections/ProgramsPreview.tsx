'use client'

import { useRef } from 'react'
import Link from 'next/link'

import { ArrowRight, BookOpen, Cpu, Globe, Award } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import TiltCard from '../ui/TiltCard'

const programData = [
  {
    id: 'tahfidz',
    icon: BookOpen,
    title: 'Tahfidz Al-Quran',
    desc: 'Program hafalan Al-Quran komprehensif dengan instruktur qari dan hafidz bersertifikat. Target 30 Juz dengan tajwid dan tafsir yang benar.',
    features: ['Hafalan 30 Juz', 'Tajwid & Tashih', 'Studi Tafsir'],
  },
  {
    id: 'digital',
    icon: Cpu,
    title: 'Teknologi Digital',
    desc: 'Program teknologi mutakhir meliputi coding, AI, robotik, dan keamanan siber. Keterampilan siap masa depan.',
    features: ['Coding & AI', 'Robotik & IoT', 'Keamanan Siber'],
  },
  {
    id: 'bilingual',
    icon: Globe,
    title: 'Program Bilingual',
    desc: 'Program imersi penuh Bahasa Inggris-Arab dengan penutur asli, persiapan TOEFL/IELTS, dan pertukaran internasional.',
    features: ['Imersi Inggris', 'Fasih Arab', 'Persiapan TOEFL'],
  },
  {
    id: 'leadership',
    icon: Award,
    title: 'Akademi Kepemimpinan',
    desc: 'Program pengembangan kepemimpinan premium yang menumbuhkan kepercayaan diri, karakter, dan visi global.',
    features: ['Pembangunan Karakter', 'Kepemimpinan Proyek', 'Dampak Sosial'],
  },
]

export default function ProgramsPreview() {
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.1 })

  return (
    <section ref={sectionRef} className="py-16 md:py-32 bg-[var(--bg-secondary)] relative overflow-hidden">
      <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.04]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10 sm:mb-16">
          <span className="section-badge justify-center">
            {'PROGRAM UNGGULAN'}
          </span>
          <h2 className="section-title max-w-3xl mx-auto">
            {'Empat Pilar Keunggulan Ar-Rahman'}
          </h2>
          <p className="section-subtitle mx-auto mt-3 sm:mt-4 text-sm sm:text-base">
            {'Program komprehensif yang dirancang untuk menumbuhkan kedalaman spiritual dan penguasaan digital'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {programData.map((prog, i) => {
            const Icon = prog.icon
            return (
              <TiltCard key={prog.id} className="group">
                <Link
                  href={`/programs/${prog.id}`}
                  className="glass-card rounded-2xl overflow-hidden !no-underline block h-full"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="p-6 sm:p-8 md:p-10">
                    <div className="verse-strip w-16 mb-6" />
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-[var(--accent)]" />
                    </div>
                    <h3 className="font-[var(--font-display)] text-2xl font-bold text-[var(--text)] mb-3">
                      {prog.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                      {prog.desc}
                    </p>
                    <div className="space-y-2 mb-8">
                      {prog.features.map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] group-hover:gap-2 transition-all">
                      {'Pelajari'}
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
  )
}
