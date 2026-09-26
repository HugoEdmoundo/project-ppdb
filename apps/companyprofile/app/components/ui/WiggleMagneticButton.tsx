'use client'

import { useRef, useEffect, type ReactNode, type MouseEvent } from 'react'
import gsap from 'gsap'

interface WiggleMagneticButtonProps {
  children: ReactNode
  strength?: number
}

export default function WiggleMagneticButton({
  children,
  strength = 0.5,
}: WiggleMagneticButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const childRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const btn = childRef.current
    if (!btn) return

    // Wiggle loop without using the CustomWiggle plugin
    // Uses keyframes to create a natural wiggle effect
    const wiggleTween = gsap.to(btn, {
      keyframes: [
        { rotation: 3, duration: 0.1 },
        { rotation: -3, duration: 0.1 },
        { rotation: 2, duration: 0.1 },
        { rotation: -2, duration: 0.1 },
        { rotation: 0, duration: 0.1 },
        { rotation: 0, duration: 1 } // pause before next wiggle
      ],
      repeat: -1,
      ease: "none"
    });

    return () => {
      wiggleTween.kill()
    }
  }, [])

  const handleMouseMove = (e: MouseEvent) => {
    const zone = containerRef.current
    const btn = childRef.current
    if (!zone || !btn) return

    const rect = zone.getBoundingClientRect()
    // Map mouse position within the zone to a value from -width/2 to width/2
    const x = gsap.utils.mapRange(rect.left, rect.right, -rect.width / 2, rect.width / 2, e.clientX)
    const y = gsap.utils.mapRange(rect.top, rect.bottom, -rect.height / 2, rect.height / 2, e.clientY)

    gsap.to(btn, {
      x: x * strength,
      y: y * strength,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto" // only overwrites x/y tweens, keeps rotation wiggle alive!
    })
  }

  const handleMouseLeave = () => {
    const btn = childRef.current
    if (!btn) return

    gsap.to(btn, { 
      x: 0, 
      y: 0,
      duration: 0.7,
      ease: "elastic.out(1, 0.4)",
      overwrite: "auto"
    })
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block', padding: '1.5rem', margin: '-1.5rem' }} 
      // added padding to increase the magnetic "zone" without affecting layout
    >
      <div ref={childRef} style={{ display: 'inline-block' }}>
        {children}
      </div>
    </div>
  )
}
