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