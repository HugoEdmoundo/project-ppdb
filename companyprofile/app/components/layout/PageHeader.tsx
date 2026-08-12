'use client'

import { useRef, useEffect } from 'react'

interface Props {
  title: string
  subtitle: string
  badge?: string
}

export default function PageHeader({ title, subtitle, badge }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const orb = orbRef.current
    if (!section || !orb) return

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger)

        gsap.to(orb, {
          y: 60,
          scale: 1.2,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      })
    })

  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg) 50%, var(--bg-secondary) 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 8s ease infinite',
      }}
    >
      <div className="absolute top-0 left-0 right-0 verse-strip" />
      <div
        ref={orbRef}
        className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-emerald) 0%, var(--color-gold) 40%, transparent 70%)',
          opacity: 0.04,
          transform: 'translateX(30%) translateY(-20%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)',
          opacity: 0.03,
        }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        {badge && <span className="section-badge">{badge}</span>}
        <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-[var(--text)] leading-[1.05] mb-3 sm:mb-4 tracking-[-0.03em]">
          {title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
