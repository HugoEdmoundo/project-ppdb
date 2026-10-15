import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { DocTrigger } from '@repo/ui'
import { cn } from '@/lib/utils'

export interface HeaderBlock {
  icon: LucideIcon
  label: string
  value: ReactNode
  active?: boolean
  pulse?: boolean
}

interface PageHeaderCardProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  docKey?: string
  blocks?: HeaderBlock[]
  loading?: boolean
}

export default function PageHeaderCard({ title, description, action, docKey, blocks, loading }: PageHeaderCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="relative flex flex-col gap-3.5 px-4 py-4 sm:px-5 sm:py-5 md:flex-row md:items-center md:justify-between">
        <div className="absolute bottom-4 left-0 top-4 hidden w-1 rounded-full bg-gradient-to-b from-emerald-bright via-emerald-primary to-gold-accent md:block" />
        <div className="md:pl-4 min-w-0">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-slate-900 md:text-3xl break-words">{title}</h1>
          {description && <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>}
        </div>
        {(action || docKey) && (
          <div className="flex flex-wrap shrink-0 items-center gap-2 pt-1 md:pt-0">
            {docKey && <DocTrigger docKey={docKey} variant="light" />}
            {action}
          </div>
        )}
      </div>

      {blocks && !loading && (
        <div className={cn(
          'grid grid-cols-1 gap-px border-t border-slate-100 bg-slate-100',
          blocks.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        )}>
          {blocks.map((block) => {
            const Icon = block.icon
            const on = !!block.active
            return (
              <div key={block.label} className="flex items-center gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 min-w-0">
                <div className={cn(
                  'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors',
                  on
                    ? 'bg-gradient-to-br from-emerald-primary/15 to-emerald-bright/20 ring-emerald-primary/10'
                    : 'bg-slate-50 ring-slate-200/60'
                )}>
                  <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', on ? 'text-primary' : 'text-slate-400')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{block.label}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                    {block.pulse && on && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    <div className={cn('text-xs sm:text-sm font-bold truncate', on ? 'text-slate-900' : 'text-slate-400')}>{block.value}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
