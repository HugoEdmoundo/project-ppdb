'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

export default function Particles({ count = 30, className = '' }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let running = false
    let w = 0
    let h = 0

    // Ukuran mengikuti elemen (bukan window.innerWidth/Height) supaya partikel
    // tidak dirender di luar section lalu terpotong.
    const size = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w
      canvas.height = h
    }

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.1,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.04 + 0.01,
      color: Math.random() > 0.5 ? 'var(--color-emerald)' : 'var(--color-gold)',
    }))

    const draw = () => {
      ctx!.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx / (w || 1)
        p.y += p.vy / (h || 1)

        if (p.x < 0) p.x += 1
        if (p.x > 1) p.x -= 1
        if (p.y < 0) p.y += 1
        if (p.y > 1) p.y -= 1

        ctx!.beginPath()
        ctx!.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx!.fillStyle =
          p.color === 'var(--color-emerald)'
            ? `rgba(26, 107, 71, ${p.opacity})`
            : `rgba(212, 168, 83, ${p.opacity})`
        ctx!.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    const start = () => {
      if (running || !w || !h) return
      running = true
      draw()
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(animId)
    }
    const resize = () => {
      size()
      // Partikel semi-permanen tetap, hanya koordinat yang dinormalisasi ulang.
    }

    size()

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    io.observe(canvas)

    window.addEventListener('resize', resize)

    // Grafis pertama kali langsung hidup kalau canvas sudah terlihat.
    start()

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}
