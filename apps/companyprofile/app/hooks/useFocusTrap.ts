'use client'

import { useEffect, useRef } from 'react'

export function useFocusTrap(open: boolean, onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const close = onCloseRef.current
    const el = ref.current
    if (!el) return

    const focusableSel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const prev = document.activeElement as HTMLElement | null

    requestAnimationFrame(() => {
      const first = el.querySelector<HTMLElement>(focusableSel)
      first?.focus()
    })

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && close) {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = el.querySelectorAll<HTMLElement>(focusableSel)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      prev?.focus()
    }
  }, [open])

  return ref
}
