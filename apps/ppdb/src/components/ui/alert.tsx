import { type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertType } from '@/types/common.types'

const alertVariants = cva(
  'flex gap-3 rounded-xl border p-4 text-sm',
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50 text-blue-800 [&_svg]:text-blue-600',
        success: 'border-emerald-primary/30 bg-emerald-light text-emerald-dark [&_svg]:text-emerald-primary',
        warning: 'border-amber-300 bg-amber-50 text-amber-800 [&_svg]:text-amber-600',
        error: 'border-rose-danger/30 bg-rose-light text-rose-dark [&_svg]:text-rose-danger',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
)

const iconMap: Record<AlertType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  type?: AlertType
  title?: string
  children?: ReactNode
}

export function Alert({ type = 'info', title, children, className, ...props }: AlertProps) {
  const Icon = iconMap[type]
  return (
    <div className={cn(alertVariants({ variant: type }), className)} {...props}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="min-w-0">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}
