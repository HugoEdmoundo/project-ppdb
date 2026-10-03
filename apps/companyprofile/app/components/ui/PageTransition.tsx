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
                onComplete: () => {
                  setTransitioning(false)
                  // Hapus transform identitas agar container tidak menjadi
                  // containing block untuk `position: fixed` dan tidak membuat
                  // stacking context permanen (sumber jank + melesetnya fixed).
                  gsap.set(containerRef.current, { clearProps: 'transform,opacity' })
                },
              }
            )
          })
        },
      })

      // Exit: konten lama memudar & mengecil
      tl.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        y: -16,
        duration: 0.2,
        ease: 'power2.in',
      }, 0)

      // Bar loading mengisi. Overlay selalu di-mount sejak awal, jadi
      // loaderRef tidak pernah null di sini (tidak ada race mount).
      tl.fromTo(
        loaderRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4, ease: 'power3.inOut' },
        0.1
      )

      // Hold singkat
      tl.to({}, { duration: 0.15 })
    }
    run()
  }, [pathname, children])

  return (
    <div className="relative">
      {/* Overlay SELALU di-mount. Versi lama memakai `{transitioning && ...}` yang
          membuat loaderRef belum ter-mount saat timeline dibuat (race), sehingga
          bar loading tidak pernah bergerak (tersangkut scaleX(0)). */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${transitioning ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'var(--bg)' }}
        aria-hidden={!transitioning}
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