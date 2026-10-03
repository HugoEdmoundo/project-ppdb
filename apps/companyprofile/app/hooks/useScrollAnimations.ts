'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onLayoutReady, prefersReducedMotion } from '@/app/lib/motion'

gsap.registerPlugin(ScrollTrigger)

export function useScrollReveal(ref: React.RefObject<HTMLElement | null>, options?: {
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  trigger?: string | Element
  start?: string
  toggleActions?: string
  stagger?: number
  /**
   * Elemen yang dianimasikan.
   * - `self` (default lama): animasi elemen `ref` itu sendiri.
   * - `children`: animasi anak langsung dari `ref`.
   *
   * Pakai `children` kalau elemen `ref` juga dipakai sebagai `trigger` ScrollTrigger
   * lain pada elemen yang sama — ScrollTrigger mengukur lewat getBoundingClientRect()
   * yang ikut transform, sehingga trigger yang ikut digeser bikin start/end bergeser.
   */
  targets?: 'self' | 'children'
}) {
  const {
    from,
    to,
    trigger,
    start,
    toggleActions,
    stagger,
    targets = 'self',
  } = options ?? {}

  useEffect(() => {
    if (!ref.current) return
    if (prefersReducedMotion()) {
      gsap.set(ref.current, { clearProps: 'all' })
      return
    }

    const ctx = gsap.context(() => {
      const children = ref.current!.children
      const tweenTargets = targets === 'children' ? Array.from(children) : ref.current!

      gsap.fromTo(
        tweenTargets,
        { opacity: 0, y: 40, ...from },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: stagger || 0,
          scrollTrigger: {
            trigger: trigger || ref.current!,
            start: start || 'top 85%',
            toggleActions: toggleActions || 'play none none reverse',
          },
          ...to,
        }
      )
    }, ref)

    // Font + gambar baru selesai dimuat setelah ScrollTrigger dihitung, jadi start/end
    // masih memakai layout lama. Refresh sekali begitu layout benar-benar final.
    const cleanupLayout = onLayoutReady(() => ScrollTrigger.refresh())

    return () => {
      cleanupLayout()
      ctx.revert()
    }
    // `from`/`to` sengaja di luar deps: pemanggil meneruskan objek literal baru tiap
    // render, dimasukkan ke deps akan membuat effect recreate tween tiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, trigger, start, toggleActions, stagger, targets])
}
