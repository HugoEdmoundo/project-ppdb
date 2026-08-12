'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useFocusTrap } from '@/app/hooks/useFocusTrap'
import { eventBus } from '@/app/lib/event-bus'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((res) => {
    eventBus.emit('confirm', opts, res)
  })
}

export default function AdminConfirm() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null)

  useEffect(() => {
    return eventBus.on('confirm', (options, res) => {
      setOpts(options as ConfirmOptions)
      setOpen(true)
      setResolve(() => res as (v: boolean) => void)
    })
  }, [])

  const answer = (v: boolean) => {
    setOpen(false)
    setTimeout(() => {
      resolve?.(v)
      setOpts(null)
    }, 200)
  }

  const trapRef = useFocusTrap(open, () => answer(false))

  if (!open || !opts) return null

  const isDanger = opts.variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) answer(false) }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 md:p-8 max-w-sm w-full"
        style={{ animation: 'confirmIn 0.2s ease-out' }}
      >
        <div className="flex items-start gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDanger ? 'bg-red-50' : 'bg-[var(--accent-subtle)]'}`}>
            <AlertTriangle className={`w-5 h-5 ${isDanger ? 'text-red-500' : 'text-[var(--accent)]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text)] mb-1">{opts.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{opts.message}</p>
          </div>
          <button onClick={() => answer(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => answer(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all duration-200"
          >
            {opts.cancelLabel || 'Batal'}
          </button>
          <button
            onClick={() => answer(true)}
            className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 shadow-md'
                : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 shadow-md'
            }`}
          >
            {opts.confirmLabel || 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}
