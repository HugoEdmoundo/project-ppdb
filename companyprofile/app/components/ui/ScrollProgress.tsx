'use client'

import { useEffect, useRef } from 'react'

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const onScroll = () => {
      const scrollTop = window.scrollY
      const maxScroll = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.documentElement.getBoundingClientRect().height
      ) - window.innerHeight
      const p = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0
      bar.style.width = `${p * 100}%`
      bar.style.opacity = p > 0 ? '1' : '0'
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none bg-[var(--border)]/20">
      <div
        ref={barRef}
        className="h-full"
        style={{
          transition: 'width 75ms linear',
          background: 'linear-gradient(90deg, var(--color-emerald) 0%, var(--color-gold) 50%, var(--color-emerald) 100%)',
        }}
      />
    </div>
  )
}
