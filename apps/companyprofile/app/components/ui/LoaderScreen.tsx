'use client'

import { useEffect, useRef, useState } from 'react'
import { getSettings } from '@/app/lib/api'

export default function LoaderScreen() {
  const [visible, setVisible] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const textRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const ring1Ref = useRef<HTMLDivElement>(null)
  const ring2Ref = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const bismillahRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const logoWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const logo = settings.find((s) => s.key === 'logo')?.value
        if (logo) setLogoUrl(logo)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const init = async () => {
    const gsap = (await import('gsap')).default
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(bismillahRef.current,
      { y: -15, opacity: 0 },
      { y: 0, opacity: 0.18, duration: 0.5 }
    )
    .fromTo(ring1Ref.current,
      { scale: 0.6, opacity: 0, rotation: 45 },
      { scale: 1, opacity: 0.08, rotation: 0, duration: 0.7 },
      '-=0.3'
    )
    .fromTo(ring2Ref.current,
      { scale: 0.4, opacity: 0, rotation: -30 },
      { scale: 1, opacity: 0.05, rotation: 0, duration: 0.7 },
      '-=0.5'
    )
    .fromTo(glowRef.current,
      { scale: 0.3, opacity: 0 },
      { scale: 2, opacity: 0.1, duration: 1, ease: 'power2.out' },
      '-=0.5'
    )
    .fromTo(logoWrapperRef.current,
      { y: -30, scale: 1.4, opacity: 0, rotation: -5 },
      { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.7)' },
      '-=0.5'
    )
    .fromTo(textRef.current,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5 },
      '-=0.2'
    )
    .fromTo(subtitleRef.current,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35 },
      '-=0.1'
    )
    .fromTo(barRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.2, ease: 'power3.inOut' },
      '-=0.1'
    )
    .to({}, { duration: 0.2 })
    .to(bismillahRef.current, { y: -8, opacity: 0, duration: 0.35 }, 'exit')
    .to(glowRef.current, { scale: 3, opacity: 0, duration: 0.4, ease: 'power2.in' }, 'exit')
    .to(ring1Ref.current, { scale: 1.3, opacity: 0, duration: 0.35 }, 'exit')
    .to(ring2Ref.current, { scale: 1.3, opacity: 0, duration: 0.35 }, 'exit+=0.05')
    .to(logoWrapperRef.current, { y: -15, scale: 0.85, opacity: 0, duration: 0.35, ease: 'power2.in' }, 'exit')
    .to(textRef.current, { y: -10, opacity: 0, duration: 0.3 }, 'exit+=0.05')
    .to(subtitleRef.current, { y: -8, opacity: 0, duration: 0.3 }, 'exit+=0.05')
    .to(barRef.current, { opacity: 0, duration: 0.2 }, 'exit+=0.1')
    .call(() => setVisible(false))
    }
    init()
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#F7F5F0] via-white to-[#ECE8DD] pointer-events-none">
      {/* Floating particles */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${4 + i * 3}px`,
              height: `${4 + i * 3}px`,
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              background: i % 2 === 0 ? 'var(--color-gold)' : 'var(--color-emerald)',
              opacity: 0.06,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${2.5 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Outer ring */}
      <div
        ref={ring1Ref}
        className="absolute w-72 h-72 rounded-full border border-[var(--color-emerald)] pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Inner ring */}
      <div
        ref={ring2Ref}
        className="absolute w-52 h-52 rounded-full border border-[var(--color-gold)] pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Golden glow */}
      <div
        ref={glowRef}
        className="absolute w-36 h-36 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-gold) 0%, var(--color-emerald) 40%, transparent 70%)',
          opacity: 0,
        }}
      />

      <div className="text-center relative z-10">
        <div
          ref={bismillahRef}
          className="arabic-quote text-xs text-[var(--color-gold)] mb-4"
          style={{ fontFamily: 'var(--font-arabic), serif', opacity: 0 }}
        >
          ﷽
        </div>

        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-full bg-[var(--color-gold)] blur-2xl opacity-10 scale-150" />
          <div ref={logoWrapperRef} style={{ opacity: 0 }} className="relative mx-auto mb-4 h-16 w-16">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Ar-Rahman"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full rounded-lg bg-[var(--color-emerald)] flex items-center justify-center text-white font-bold text-2xl select-none">ار</div>
            )}
          </div>
        </div>

        <div ref={textRef} className="text-sm font-[var(--font-display)] font-bold text-[var(--color-slate)] tracking-[0.3em] uppercase" style={{ opacity: 0 }}>
          PTDARRAHMAN
        </div>

        <div ref={subtitleRef} className="text-[10px] sm:text-xs text-[var(--text-muted)] tracking-[0.18em] uppercase mt-1.5" style={{ opacity: 0 }}>
          <span className="text-[var(--color-gold)]">Quran </span> &amp; Digital Tahfidz Boarding School
        </div>

        <div className="flex justify-center mt-6">
          <div className="w-36 h-[2px] rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              ref={barRef}
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-emerald)] to-[var(--color-gold)] origin-left"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
