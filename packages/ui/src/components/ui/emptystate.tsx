import * as React from 'react'
import { FolderOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center px-6 py-10 sm:py-12 text-center rounded-2xl border border-dashed border-border bg-white/50 backdrop-blur-sm',
        className
      )}
    >
      {/* Soft decorative glow */}
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-primary/20 to-transparent" />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-light ring-1 ring-emerald-primary/10 text-emerald-primary shadow-sm mb-4">
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="font-heading text-lg font-bold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">{description}</p>
      )}

      {action ? action : actionLabel && onAction ? (
        <Button variant="outline" size="sm" onClick={onAction} className="min-h-[36px]">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
