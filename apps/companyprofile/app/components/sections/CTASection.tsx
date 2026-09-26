'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'

import { ArrowRight, Phone } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import dynamic from 'next/dynamic'
import MagneticButton from '../ui/MagneticButton'
import WiggleMagneticButton from '../ui/WiggleMagneticButton'
import PpdbCountdown from '../ui/PpdbCountdown'
import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import { buildSchedule, type ActivePpdbWave } from '@/app/lib/ppdb'

const Particles = dynamic(() => import('../ui/Particles'), { ssr: false })

export default function CTASection({ wave = null }: { wave?: ActivePpdbWave | null }) {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const ppdb = buildSchedule(wave)

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
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--color-emerald) 0%, #0D3B28 50%, #0A0A0F 100%)',
      }}
    >
      <Particles count={25} />
      <div ref={bgRef} className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(2px 2px at 20px 30px, white, transparent)', backgroundSize: '60px 60px' }}
      />

      <div className="relative z-10">
        <ContainerScroll
          titleComponent={
            <>
              <span className="arabic-quote text-xl sm:text-2xl md:text-3xl text-[var(--color-gold-light)] opacity-30 mb-6 sm:mb-8 block text-center">
                «وَعَلَّمَ آدَمَ الأَسْمَاءَ كُلَّهَا»
              </span>
              <h2 className="font-[var(--font-display)] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-4 sm:mb-6 max-w-4xl mx-auto px-4 text-center">
                {'Mulai Perjalanan Luar Biasa Anakmu'}
              </h2>
            </>
          }
        >
          <div className="flex flex-col items-center justify-center h-full w-full bg-[#0A1A14] text-white p-6 sm:p-8 md:p-12 text-center rounded-xl border border-white/10">
            <p className="text-sm sm:text-base md:text-lg text-white/80 mb-8 sm:mb-12 max-w-2xl mx-auto">
              {ppdb.academicYear ? (
                <>
                  {'Pendaftaran Tahun Ajaran '}
                  <strong className="text-white">{ppdb.academicYear}</strong>
                  {' akan dibuka.'}
                  {ppdb.quota ? ` Kuota ${ppdb.quota} peserta.` : ' Kuota terbatas.'}
                  {' Berikan anak Anda hadiah keunggulan Al-Quran dan penguasaan digital.'}
                </>
              ) : (
                'Pendaftaran Peserta Didik Baru akan segera dibuka. Kuota terbatas. Berikan anak Anda hadiah keunggulan Al-Quran dan penguasaan digital.'
              )}
            </p>

            <PpdbCountdown wave={wave} />

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-4 sm:mt-8">
              <WiggleMagneticButton strength={0.6}>
                <Link
                  href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:5174'}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[var(--color-gold)] text-[var(--text)] text-xs sm:text-sm font-bold rounded-full shadow-xl hover:shadow-2xl hover:bg-[var(--color-gold-light)] transition-all"
                >
                  {'Daftar Sekarang'}
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              </WiggleMagneticButton>
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
        </ContainerScroll>
      </div>
    </section>
  )
}
