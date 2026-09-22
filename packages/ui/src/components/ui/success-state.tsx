import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SuccessStateProps {
  badge?: string
  title: string
  titleEn?: string
  description?: string
  icon?: LucideIcon
  children?: ReactNode
  actions?: ReactNode
  fullscreen?: boolean
  className?: string
}

export function SuccessState({
  badge,
  title,
  titleEn,
  description,
  icon,
  children,
  actions,
  fullscreen = true,
  className,
}: SuccessStateProps) {
  const Icon = icon ?? CheckCircle2

  return (
    <div
      className={cn(
        'relative flex items-center justify-center px-4 py-12',
        fullscreen && 'min-h-dvh',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-light/50 via-transparent to-gold-bg/50" />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12 text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-primary to-gold-accent rounded-2xl blur-lg opacity-20 animate-pulse" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-primary to-gold-accent rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-light/70 border border-emerald-primary/30 text-emerald-primary text-xs font-bold px-3 py-1 mb-4">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {badge}
            </span>
          )}

          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{title}</h2>

          {titleEn && (
            <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase mb-6">
              {titleEn}
            </p>
          )}

          {description && (
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              {description}
            </p>
          )}

          {children && <div className="mb-8">{children}</div>}

          {actions && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
