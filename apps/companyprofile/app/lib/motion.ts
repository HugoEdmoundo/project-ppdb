export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => callback(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

export function onLayoutReady(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const run = () => {
    callback()
  }

  const fonts = document.fonts?.ready
  if (fonts) {
    fonts.then(run).catch(() => {})
  }

  if (document.readyState === 'complete') {
    run()
  } else {
    window.addEventListener('load', run, { once: true })
  }

  const timer = window.setTimeout(run, 800)

  return () => {
    window.removeEventListener('load', run)
    window.clearTimeout(timer)
  }
}
