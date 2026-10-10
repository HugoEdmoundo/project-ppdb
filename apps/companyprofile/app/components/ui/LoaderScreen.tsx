'use client'

import { useEffect, useState } from 'react'

type Phase = 'show' | 'hide' | 'gone'

export default function LoaderScreen({ logoUrl }: { logoUrl?: string }) {
  const [phase, setPhase] = useState<Phase>('show')

  useEffect(() => {
    const show = window.setTimeout(() => setPhase('hide'), 450)
    const gone = window.setTimeout(() => setPhase('gone'), 750)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(gone)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 bg-[var(--bg,#fff)] transition-opacity duration-300 ${
        phase === 'hide' ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-hidden={phase === 'hide'}
    >
      {logoUrl ? <img src={logoUrl} alt="" className="mb-2 h-14 max-w-40 object-contain" /> : null}
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700" aria-hidden="true" />
      <span className="text-sm text-slate-600">Memuat halaman...</span>
    </div>
  )
}
