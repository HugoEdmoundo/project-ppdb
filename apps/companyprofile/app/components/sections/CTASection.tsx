'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

import { ArrowRight, Phone } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import dynamic from 'next/dynamic'
import MagneticButton from '../ui/MagneticButton'

const Particles = dynamic(() => import('../ui/Particles'), { ssr: false })

const DEFAULT_DEADLINE = '2027-07-01T00:00:00'
const DEADLINE = process.env.NEXT_PUBLIC_PPDB_DEADLINE || DEFAULT_DEADLINE

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    function calc() {
      const diff = new Date(DEADLINE).getTime() - Date.now()
      if (diff <= 0) return null
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      }
    }
    const timer = setInterval(() => {
      const next = calc()
      setTimeLeft(next)
      // Hentikan interval begitu countdown habis agar tidak berdetak terus.
      if (!next) clearInterval(timer)
    }, 1000)
    setTimeout(() => {
      setTimeLeft(calc())
    }, 0)
    return () => clearInterval(timer)
  }, [])

  if (!timeLeft) return null

  return (
    <div className="flex justify-center gap-3 sm:gap-5 md:gap-8 mb-8 sm:mb-10">
      {[
        { label: 'Hari', value: timeLeft.days },
        { label: 'Jam', value: timeLeft.hours },
        { label: 'Menit', value: timeLeft.minutes },
        { label: 'Detik', value: timeLeft.seconds },
      ].map((t) => (
        <div key={t.label} className="text-center">
          <div className="font-[var(--font-display)] text-2xl sm:text-3xl md:text-4xl font-bold text-white tabular-nums leading-none">
            {String(t.value).padStart(2, '0')}
          </div>
          <div className="text-[10px] sm:text-xs font-[var(--font-heading)] uppercase tracking-widest text-white/50 mt-1">{t.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%' })

  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)
        if (bgRef.current) {
          gsap.to(bgRef.current, {
            backgroundPosition: '50% 100%',
            ease: 'none',
            scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
          })
        }
      })
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-16 md:py-40 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--color-emerald) 0%, #0D3B28 50%, #0A0A0F 100%)',
      }}
    >
      <Particles count={25} />
      <div ref={bgRef} className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(2px 2px at 20px 30px, white, transparent)', backgroundSize: '60px 60px' }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <span className="arabic-quote text-xl sm:text-2xl md:text-3xl text-[var(--color-gold-light)] opacity-30 mb-6 sm:mb-8 block">
          «وَعَلَّمَ آدَمَ الأَسْمَاءَ كُلَّهَا»
        </span>

        <h2 className="font-[var(--font-display)] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-4 sm:mb-6">
          {'Mulai Perjalanan Luar Biasa Anakmu'}
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-white/60 mb-8 sm:mb-10 max-w-2xl mx-auto">
          {'Pendaftaran Tahun Ajaran 2027/2028 akan dibuka. Kuota terbatas. Berikan anak Anda hadiah keunggulan Al-Quran dan penguasaan digital.'}
        </p>

        <CountdownTimer />

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <MagneticButton strength={0.3}>
          <Link
            href="/ppdb"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[var(--color-gold)] text-[var(--text)] text-xs sm:text-sm font-bold rounded-full shadow-xl hover:shadow-2xl hover:bg-[var(--color-gold-light)] transition-all"
          >
            {'Daftar Sekarang'}
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
          </MagneticButton>
          <MagneticButton strength={0.3}>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-white/20 text-white text-xs sm:text-sm font-bold rounded-full hover:bg-white/10 hover:border-white/40 transition-all"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {'Hubungi Kami'}
          </Link>
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}
