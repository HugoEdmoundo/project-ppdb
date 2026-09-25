'use client'

import { useEffect, useState } from 'react'

export default function LoaderScreen({ logoUrl }: { logoUrl?: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 bg-[var(--bg,#fff)]"
      role="status"
      aria-live="polite"
    >
      {logoUrl ? <img src={logoUrl} alt="" className="mb-2 h-14 max-w-40 object-contain" /> : null}
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700/20 border-t-emerald-700" aria-hidden="true" />
      <span className="text-sm text-slate-600">Memuat halaman...</span>
    </div>
  )
}
