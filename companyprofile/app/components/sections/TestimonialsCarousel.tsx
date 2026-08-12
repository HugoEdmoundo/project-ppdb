'use client'

import { useRef } from 'react'
import Image from 'next/image'

import { Quote } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollAnimations'
import type { Testimonial } from '@/app/lib/types'
import Marquee from '../ui/Marquee'

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 w-[85vw] sm:w-[380px] max-w-[380px] flex-shrink-0">
      <Quote className="w-6 h-6 text-[var(--accent)] opacity-20 mb-3" />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5 italic">
        &ldquo;{(t.content?.quote || t.content?.text || '')}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--accent)]/20 flex-shrink-0 relative">
          {t.image ? (
            <Image src={t.image} alt={t.name || ''} width={40} height={40} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">{t.name?.charAt(0) || '?'}</div>
          )}
        </div>
        <div>
          <div className="font-[var(--font-heading)] font-bold text-xs">{t.name}</div>
          <div className="text-[11px] sm:text-xs text-[var(--text-muted)]">{t.child}</div>
        </div>
      </div>
    </div>
  )
}

export default function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  useScrollReveal(sectionRef, { start: 'top 80%' })

  return (
    <section ref={sectionRef} className="py-16 md:py-32 bg-[var(--bg-secondary)] overflow-hidden">
      <div className="absolute inset-0 bg-pattern-grid opacity-[0.03]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        <div className="text-center">
          <span className="section-badge justify-center">
            {'TESTIMONI'}
          </span>
          <h2 className="section-title">
            {'Suara Keunggulan'}
          </h2>
        </div>
      </div>

      <div>
        <Marquee direction="left" speed={20} className="group">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
