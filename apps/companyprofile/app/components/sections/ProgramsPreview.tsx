'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'

import { ArrowRight, BookOpen, Cpu, Globe, Award } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import { useProgramLinks } from '../../hooks/useProgramLinks'
import { gsap, ScrollTrigger } from '@/app/lib/gsap'
import { onLayoutReady, prefersReducedMotion } from '@/app/lib/motion'
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
  const headerRef = useRef<HTMLDivElement>(null)
  const pinWrapRef = useRef<HTMLDivElement>(null)
  const pinContainerRef = useRef<HTMLDivElement>(null)
  const { hrefFor } = useProgramLinks()

  // Gunakan headerRef (bukan sectionRef) supaya useScrollReveal tidak
  // berkonflik dengan ScrollTrigger pin yang juga menempel di sectionRef.
  useScrollReveal(headerRef, { start: 'top 80%', stagger: 0.1 })

  useEffect(() => {
    if (prefersReducedMotion()) {
      if (pinWrapRef.current) gsap.set(pinWrapRef.current, { clearProps: 'all' })
      return
    }

    const ctx = gsap.context(() => {
      const sec = sectionRef.current
      const pinContainer = pinContainerRef.current
      const pinWrap = pinWrapRef.current
      if (!sec || !pinContainer || !pinWrap) return

      const getScrollDist = () =>
        Math.max(0, pinWrap.scrollWidth - window.innerWidth + 64) // +64 untuk extra padding

      gsap.to(pinWrap, {
        x: () => -getScrollDist(),
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          pin: pinContainer,
          scrub: 1.2,
          start: "top top",
          end: () => `+=${getScrollDist()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        }
      });
    }, sectionRef);

    // Refresh terkoordinasi, bukan `setTimeout(..., 100)`. Timeout tetap mengukur
    // layout saat gambar Unsplash + webfont (`display: swap`) belum dimuat, lalu
    // ScrollTrigger meng-cache start/end yang salah dan tidak pernah dihitung ulang —
    // Akibatnya pin horizontal berhenti di tengah dan kartu tertinggal.
    const cleanupLayout = onLayoutReady(() => ScrollTrigger.refresh());

    return () => {
      cleanupLayout();
      ctx.revert();
    }
  }, [])

  return (
    <section ref={sectionRef} className="min-h-[100vh] relative overflow-hidden z-10 bg-[var(--bg-secondary)]">
      <div ref={pinContainerRef} className="pt-16 md:pt-24 pb-16 md:pb-24 min-h-[100vh] flex flex-col relative w-full h-full">
        <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.04]" />

      {/* headerRef: target useScrollReveal, terpisah dari section yang di-pin */}
      <div ref={headerRef} className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative z-10 shrink-0">
        <div className="text-center mb-6 sm:mb-8">
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
      </div>

      <div className="relative z-10 w-full flex-1 flex items-start pt-2 sm:pt-4">
        <div ref={pinWrapRef} className="horiz-gallery-strip flex gap-4 sm:gap-6 px-4 sm:px-6 md:px-12 w-max">
          {programData.map((prog) => {
            const Icon = prog.icon
            return (
              <TiltCard key={prog.id} className="group shrink-0 w-[85vw] sm:w-[380px] md:w-[400px]">
                <Link
                  href={hrefFor(prog.id)}
                  className="glass-card rounded-2xl overflow-hidden !no-underline flex flex-col h-full"
                >
                  <div className="p-5 sm:p-6 md:p-7 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="verse-strip w-12" />
                      <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-[var(--accent)]" />
                      </div>
                    </div>
                    <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                      {prog.title}
                    </h3>
                    <p className="text-sm sm:text-[15px] text-[var(--text)] opacity-80 leading-relaxed mb-5 font-medium">
                      {prog.desc}
                    </p>
                    <div className="space-y-2.5 mb-6 flex-1">
                      {prog.features.map((f, j) => (
                        <div key={j} className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 shadow-[0_0_8px_var(--accent)]" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm sm:text-[15px] font-bold text-[var(--accent)] group-hover:gap-3 transition-all mt-auto pt-4 border-t border-white/5 dark:border-white/10">
                      {'Pelajari Selengkapnya'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </TiltCard>
            )
          })}
        </div>
      </div>
      </div>
    </section>
  )
}
