'use client'

import { useRef, type ReactNode, type MouseEvent } from 'react'

interface MagneticButtonProps {
  children: ReactNode
  strength?: number
}

export default function MagneticButton({
  children,
  strength = 0.4,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * strength
    const y = (e.clientY - rect.top - rect.height / 2) * strength
    el.firstElementChild?.setAttribute('style', `transform: translate(${x}px, ${y}px); transition: transform 0.1s ease-out; ${el.firstElementChild?.getAttribute('style') || ''}`)
  }

  const handleMouseLeave = () => {
    const el = ref.current?.firstElementChild as HTMLElement | null
    if (!el) return
    el.style.transform = 'translate(0px, 0px)'
    el.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
    </div>
  )
}
