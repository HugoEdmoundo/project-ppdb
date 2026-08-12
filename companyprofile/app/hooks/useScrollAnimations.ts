'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useScrollReveal(ref: React.RefObject<HTMLElement | null>, options?: {
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  trigger?: string | Element
  start?: string
  toggleActions?: string
  stagger?: number
}) {
  const { from, to, trigger, start, toggleActions, stagger } = options ?? {}

  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      const children = ref.current!.children
      const targets = stagger ? Array.from(children) : ref.current

      gsap.fromTo(
        targets,
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
    })

    return () => ctx.revert()
  }, [ref, from, to, trigger, start, toggleActions, stagger])
}
