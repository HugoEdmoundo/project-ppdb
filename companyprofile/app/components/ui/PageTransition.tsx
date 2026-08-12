'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitioning, setTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef(pathname)

  useEffect(() => {
    const run = async () => {
    if (prevPath.current === pathname || prevPath.current === null) {
      prevPath.current = pathname
      setDisplayChildren(children)
      return
    }
    prevPath.current = pathname

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(() => setDisplayChildren(children))
      return
    }

    setTransitioning(true)

    const gsap = (await import('gsap')).default
    const tl = gsap.timeline({
      onComplete: () => {
        setDisplayChildren(children)
        requestAnimationFrame(() => {
          gsap.fromTo(
            containerRef.current,
            { opacity: 0, y: 24, scale: 0.97 },
            {
              opacity: 1, y: 0, scale: 1,
              duration: 0.5, ease: 'power3.out',
              onComplete: () => setTransitioning(false),
            }
          )
        })
      },
    })

    // Exit: current content compresses and fades
    tl.to(containerRef.current, {
      opacity: 0,
      scale: 0.95,
      y: -16,
      duration: 0.2,
      ease: 'power2.in',
    })

    // Loader bar fills
    if (loaderRef.current) {
      tl.fromTo(
        loaderRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4, ease: 'power3.inOut' },
        '-=0.1'
      )
    }

    // Brief hold
    tl.to({}, { duration: 0.15 })
    }
    run()
  }, [pathname, children])

  return (
    <div className="relative">
      {/* Fullscreen overlay with loader during transition */}
      {transitioning && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'var(--bg)' }}
        >
          <div className="text-center">
            <div className="w-32 h-[2px] rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div
                ref={loaderRef}
                className="h-full rounded-full origin-left"
                style={{
                  transform: 'scaleX(0)',
                  background: 'linear-gradient(90deg, var(--color-gold), var(--color-emerald), var(--color-gold))',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Page content wrapper */}
      <div
        ref={containerRef}
        className="min-h-[60vh]"
      >
        {displayChildren}
      </div>
    </div>
  )
}
