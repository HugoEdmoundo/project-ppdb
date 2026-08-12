'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import TiltCard from '../ui/TiltCard'

const facilities = [
  {
    image: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=2070&auto=format&fit=crop',
    name: 'Masjid Raya',
    desc: 'Masjid luas untuk shalat harian dan studi Al-Quran',
    large: true,
  },
  {
    image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop',
    name: 'Lab Komputer',
    desc: 'Workstation berkinerja tinggi untuk coding & AI',
    large: false,
  },
  {
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop',
    name: 'Perpustakaan Digital',
    desc: '50,000+ buku dan sumber daya digital',
    large: false,
  },
  {
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop',
    name: 'Asrama Modern',
    desc: 'Asrama nyaman dengan pengawasan 24 jam',
    large: false,
  },
]

export default function FacilitiesPreview() {
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%', stagger: 0.08 })

  const [first, ...rest] = facilities

  return (
    <section ref={sectionRef} className="py-16 md:py-32 bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <span className="section-badge justify-center">
            {'FASILITAS KELAS DUNIA'}
          </span>
          <h2 className="section-title max-w-3xl mx-auto">
            {'Pesantren Premium untuk Generasi Premium'}
          </h2>
        </div>

        {/* Bento Grid — single column on mobile, 12-col on lg+ */}
        <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Large left card */}
          <TiltCard glare={false} maxTilt={5} className="md:col-span-2 lg:col-span-7">
            <div className="img-overlay rounded-xl sm:rounded-2xl shadow-md aspect-[4/3] relative">
              <Image src={first.image} alt={first.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
              <div className="overlay p-3 sm:p-6">
                <h3 className="text-base sm:text-xl md:text-2xl font-bold font-[var(--font-display)] text-white mb-0.5 sm:mb-1">
                  {first.name}
                </h3>
                <p className="text-xs sm:text-sm text-white/70">
                  {first.desc}
                </p>
              </div>
            </div>
          </TiltCard>

          {/* Right column */}
          <div className="md:col-span-2 lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
            {rest.map((f, i) => (
              <TiltCard key={i} glare={false} maxTilt={5} className={`${i >= 2 ? 'col-span-2' : ''}`}>
                <div className={`img-overlay rounded-xl sm:rounded-2xl shadow-md relative ${i >= 2 ? 'aspect-[3/1] sm:aspect-[3/1]' : 'aspect-square'}`}>
                  <Image src={f.image} alt={f.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                  <div className="overlay p-3 sm:p-5">
                    <h3 className="text-xs sm:text-base md:text-lg font-bold font-[var(--font-display)] text-white mb-0.5">
                      {f.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/70">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link href="/facilities" className="btn-ghost text-xs sm:text-sm">
            {'Jelajahi Semua Fasilitas'}
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
