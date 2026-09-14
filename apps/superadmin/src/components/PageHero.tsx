import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui'

export interface HeroChip {
  icon: LucideIcon
  label: string
}

interface PageHeroProps {
  eyebrow?: string
  title: string
  description?: string
  chips?: HeroChip[]
  actions?: ReactNode
  loading?: boolean
}

/**
 * Kartu hero gradient ala dashboard — dipakai konsisten di semua halaman
 * (Dashboard, Users, Roles, Pendaftar, Notifikasi).
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  chips = [],
  actions,
  loading = false,
}: PageHeroProps) {
  if (loading) {
    return <Skeleton className="h-44 w-full rounded-3xl" />
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E3B26] via-[#1A6B47] to-[#237A52] p-6 text-white shadow-lg shadow-emerald-900/20 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-pattern-dots opacity-20" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[#D4A853]/25" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">{eyebrow}</p>
          )}
          <h1 className="mt-0.5 font-heading text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-emerald-50/90">{description}</p>
          )}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => {
                const ChipIcon = chip.icon
                return (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25"
                  >
                    <ChipIcon className="h-3.5 w-3.5" />
                    {chip.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
