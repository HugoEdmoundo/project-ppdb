'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center px-6 py-12 sm:py-14 text-center rounded-2xl border border-dashed border-[var(--border)] bg-white/50 backdrop-blur-sm ${className}`}>
      {/* Soft decorative glow */}
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/10 text-[var(--accent)] shadow-sm mb-4">
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-md mb-6">{description}</p>
      )}

      {action}
    </div>
  )
}
