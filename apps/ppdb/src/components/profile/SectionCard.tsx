import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from "@/components/ui"
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  accent?: string
  children: ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  accent = 'bg-primary',
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn('overflow-hidden shadow-sm', className)}>
      <div className="border-b border-border/60 bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className={cn('h-5 w-1 shrink-0 rounded-full', accent)} />
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h3 className="font-heading text-sm font-bold text-foreground">{title}</h3>
        </div>
        {description && <p className="mt-1.5 pl-3.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  )
}
