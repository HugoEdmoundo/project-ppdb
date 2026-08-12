'use client'

import { useRef, useEffect } from 'react'

interface MarqueeProps {
  children: React.ReactNode
  direction?: 'left' | 'right'
  speed?: number
  className?: string
}

export default function Marquee({
  children,
  direction = 'left',
  speed = 40,
  className = '',
}: MarqueeProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!innerRef.current || !containerRef.current) return

    const content = innerRef.current
    const container = containerRef.current

    const init = async () => {
      const gsap = (await import('gsap')).default
      tweenRef.current = gsap.to(content, {
        xPercent: direction === 'left' ? -50 : 50,
        duration: speed,
        ease: 'none',
        repeat: -1,
      })
    }
    init()

    const handleMouseEnter = () => {
      if (tweenRef.current) tweenRef.current.timeScale(0)
    }
    const handleMouseLeave = () => {
      if (tweenRef.current) tweenRef.current.timeScale(1)
    }

    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (tweenRef.current) tweenRef.current.kill()
      tweenRef.current = null
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [direction, speed])

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)' }}
    >
      <div
        ref={innerRef}
        className="flex gap-6"
        style={{ width: 'max-content' }}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
