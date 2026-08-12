'use client'

import { useEffect, type RefObject } from 'react'

export function useTiltEffect(ref: RefObject<HTMLElement | null>, options?: {
  maxTilt?: number
  scale?: number
  speed?: number
  glare?: boolean
}) {
  const { maxTilt = 8, scale = 1.02, speed = 400, glare = true } = options || {}

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    let glareEl: HTMLDivElement | null = null
    if (glare) {
      glareEl = document.createElement('div')
      glareEl.style.cssText = `
        position: absolute; inset: 0; border-radius: inherit;
        background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%);
        opacity: 0; transition: opacity 0.4s ease; pointer-events: none; z-index: 2;
      `
      el.style.position = 'relative'
      el.appendChild(glareEl)
    }

    const onMouseEnter = () => {
      el.style.transition = `transform ${speed * 0.3}ms ease`
      if (glareEl) glareEl.style.opacity = '1'
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = ((y - centerY) / centerY) * -maxTilt
      const rotateY = ((x - centerX) / centerX) * maxTilt

      el.style.transition = `transform ${speed * 0.1}ms ease-out`
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale},${scale},${scale})`

      if (glareEl) {
        const glareX = (x / rect.width) * 100
        const glareY = (y / rect.height) * 100
        glareEl.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
      }
    }

    const onMouseLeave = () => {
      el.style.transition = `transform ${speed}ms ease`
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
      if (glareEl) glareEl.style.opacity = '0'
    }

    el.addEventListener('mouseenter', onMouseEnter)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      if (glareEl) el.removeChild(glareEl)
    }
  }, [ref, maxTilt, scale, speed, glare])
}
