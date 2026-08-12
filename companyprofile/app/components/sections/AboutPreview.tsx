'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { ArrowRight, BookOpen, Cpu, Heart } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'

const coreValues = [
  { icon: BookOpen, idn: 'Al-Quran Utama' },
  { icon: Cpu, idn: 'Berbasis Teknologi' },
  { icon: Heart, idn: 'Berbasis Karakter' },
]

export default function AboutPreview() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageGridRef = useRef<HTMLDivElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%' })

  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)
        const imgs = imageGridRef.current?.querySelectorAll('.img-overlay')
        if (imgs) {
          gsap.fromTo(imgs,
            { opacity: 0, y: 60, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
              scrollTrigger: { trigger: imageGridRef.current, start: 'top 80%' } }
          )
        }
      })
    })
  }, [])

  const images = [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop',
  ]

  return (
    <section ref={sectionRef} className="relative py-16 md:py-32 bg-[var(--bg)]">
      <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left - Image Mosaic */}
          <div ref={imageGridRef} className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="space-y-2 sm:space-y-4">
              <div className="img-overlay aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                <Image src={images[0]} alt="Boarding School" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </div>
              <div className="img-overlay aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                <Image src={images[1]} alt="Students" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </div>
            </div>
            <div className="space-y-2 sm:space-y-4 pt-4 sm:pt-8">
              <div className="img-overlay aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                <Image src={images[2]} alt="Technology Lab" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </div>
              <div className="img-overlay aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-md relative">
                <Image src={images[3]} alt="Sports" fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            <span className="section-badge">
              {'SIAPA KAMI'}
            </span>
            <h2 className="section-title mb-4 sm:mb-6">
              {'Lima Tahun Melahirkan Generasi Unggul'}
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">
              {'Sejak 2021, Ar-Rahman telah menjadi pelopor model pendidikan unik yang mengintegrasikan kebijaksanaan abadi Al-Quran dengan teknologi digital mutakhir. Kami tidak hanya mengajar — kami menginspirasi generasi pemimpin yang kokoh secara spiritual dan kompetitif secara global.'}
            </p>

            <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
              {coreValues.map((v) => (
                <div key={v.idn} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                    <v.icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <span className="text-sm font-semibold font-[var(--font-heading)]">
                    {v.idn}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:gap-3 transition-all group"
            >
              {'Pelajari Lebih Lanjut'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
