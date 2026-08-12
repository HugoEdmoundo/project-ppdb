'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ArrowRight, ChevronDown, Award, Calendar } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import dynamic from 'next/dynamic'
import MagneticButton from '../ui/MagneticButton'

const Particles = dynamic(() => import('../ui/Particles'), { ssr: false })

export default function HeroSection() {
  const pathname = usePathname()
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 60%' })

  const decorRef1 = useRef<HTMLDivElement>(null)
  const decorRef2 = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)

        if (decorRef1.current) {
          gsap.to(decorRef1.current, {
            y: -80,
            ease: 'none',
            scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
          })
        }
        if (decorRef2.current) {
          gsap.to(decorRef2.current, {
            y: 60,
            ease: 'none',
            scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
          })
        }
        if (rightRef.current) {
          gsap.fromTo(rightRef.current,
            { opacity: 0, x: 100, scale: 0.95 },
            { opacity: 1, x: 0, scale: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: rightRef.current, start: 'top 80%' } }
          )
        }
      })
    })
  }, [])

  if (pathname !== '/') return null

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#F7F5F0] via-white to-[#F0EDE4]"
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-pattern-dots opacity-[0.15] pointer-events-none" />
      {/* Decorative background with parallax */}
      <Particles count={40} />
      <div ref={decorRef1} className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-emerald) 0%, transparent 70%)' }}
      />
      <div ref={decorRef2} className="absolute bottom-0 left-0 w-1/3 h-1/2 opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, var(--color-gold) 0%, transparent 70%)' }}
      />

      {/* Verse Strip top */}
      <div className="absolute top-0 left-0 right-0 verse-strip" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full pt-20 sm:pt-28 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
              <span className="w-6 sm:w-8 h-[2px] bg-[var(--accent-gold)]" />
              <span className="text-[10px] sm:text-xs font-[var(--font-heading)] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.15em] text-[var(--accent-gold)]">
                {'DIDIRIKAN 2021'}
              </span>
              <span className="w-1 h-1 rounded-full bg-[var(--accent-gold)] hidden sm:inline-block" />
              <span className="text-[10px] sm:text-xs font-[var(--font-heading)] font-medium uppercase tracking-[0.08em] sm:tracking-[0.1em] text-[var(--text-muted)] hidden sm:inline">
                {'BEKASI, JAWA BARAT'}
              </span>
            </div>

            {/* Arabic Quote */}
            <div className="arabic-quote text-lg sm:text-xl md:text-2xl text-[var(--accent-gold)] mb-2 sm:mb-3 opacity-60">
              «اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ»
            </div>
            <p className="text-xs sm:text-sm italic text-[var(--text-muted)] mb-4 sm:mb-6">
              {'"Bacalah dengan nama Tuhanmu yang menciptakan" — Al-Alaq 96:1'}
            </p>

            <h1 className="font-[var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[var(--text)] leading-[1.05] sm:leading-[0.92] mb-4 sm:mb-6 tracking-[-0.04em]">
              {(
                <>
                  Pesantren<br />
                  Tahfidz<br />
                  <span className="text-[var(--accent)]">Digital</span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] max-w-xl mb-6 sm:mb-8 leading-relaxed">
              {'Mendidik generasi hafizh yang melek teknologi. Tempat Al-Quran dan Artificial Intelligence berjalan berdampingan.'}
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
              <MagneticButton strength={0.3}>
              <Link
                href="/programs"
                className="btn-primary gap-2 shadow-md hover:shadow-lg text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5"
              >
                {'Lihat Program'}
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
              </MagneticButton>
              <MagneticButton strength={0.3}>
              <Link
                href="/about"
                className="btn-ghost text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5"
              >
                {'Tentang Kami'}
              </Link>
              </MagneticButton>
            </div>

          </div>

          {/* Right Visual */}
          <div ref={rightRef} className="lg:col-span-5 hidden lg:block">
            <div className="relative pl-8">
              {/* Floating image stack */}
              <div className="relative">
                {/* Main image */}
                <div className="rounded-2xl overflow-hidden shadow-xl border border-white/60"
                  style={{ transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)' }}
                >
                  <Image
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop"
                    alt="Students"
                    width={500}
                    height={375}
                    className="w-full aspect-[4/3] object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Badge - Top right */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-[var(--color-border)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                    <Award className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-[var(--font-heading)] text-[var(--accent)]">
                      {'Sekolah Islam Terbaik'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">2024 • {'Penghargaan Nasional'}</div>
                  </div>
                </div>

                {/* Card - Bottom right */}
                <div className="absolute -bottom-5 -right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-[var(--color-border)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-subtle)] flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {'Pendaftaran'}
                    </div>
                    <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--accent-gold)]">
                      2027/2028
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative dots pattern */}
              <div className="absolute -bottom-8 -right-8 grid grid-cols-6 gap-2 opacity-10 pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex flex-col items-center mt-10 sm:mt-16 animate-bounce">
          <span className="text-[10px] sm:text-xs font-[var(--font-heading)] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--text-muted)] mb-1 sm:mb-2">
            {'Scroll untuk Eksplorasi'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </section>
  )
}
