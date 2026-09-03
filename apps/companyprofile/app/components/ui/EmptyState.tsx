'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  hint,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-empty-in relative flex flex-col items-center justify-center px-6 py-12 sm:py-14 text-center rounded-2xl border border-dashed border-[var(--border)] bg-white/50 backdrop-blur-sm overflow-hidden ${className}`}
    >
      {/* Decorative dot pattern */}
      <div className="absolute inset-0 bg-pattern-dots-gold opacity-[0.05]" />

      {/* Soft decorative glow */}
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />

      <div className="relative">
        {/* Icon with pulsing ring + float */}
        <div className="relative mb-4 flex justify-center">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--accent-gold) 0%, transparent 70%)', animation: 'ringPulse 2.5s ease-in-out infinite' }}
          />
          <div className="animate-icon-float relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 text-[var(--accent)] shadow-sm">
            <Icon className="h-8 w-8" />
          </div>
        </div>
      </div>

      <h3 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md mb-6">{description}</p>
      )}

      {action}

      {hint && (
        <p className="mt-4 text-xs text-[var(--text-muted)]/80 italic">{hint}</p>
      )}
    </div>
  )
}
