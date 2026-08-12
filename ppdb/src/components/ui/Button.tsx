import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-emerald-primary to-[#145337] text-white shadow-[0_8px_20px_rgba(26,107,71,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_12px_28px_rgba(26,107,71,0.45)] hover:from-[#1E7B52] hover:to-[#176140]',
        gold: 'bg-gradient-to-r from-gold-accent to-[#C2933C] text-obsidian font-extrabold shadow-[0_8px_20px_rgba(212,168,83,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_12px_28px_rgba(212,168,83,0.45)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        outline:
          'border-2 border-emerald-primary/40 text-emerald-primary bg-white/40 backdrop-blur-md hover:bg-white/80 hover:border-emerald-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
        ghost:
          'text-slate-dark hover:bg-white/60 hover:text-emerald-primary backdrop-blur-xs',
        danger:
          'bg-gradient-to-r from-rose-danger to-[#C92A20] text-white shadow-[0_8px_20px_rgba(255,59,48,0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_12px_28px_rgba(255,59,48,0.45)]',
        glass:
          'bg-white/75 backdrop-blur-xl border border-white/90 text-obsidian shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:bg-white hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'text-xs px-3 py-2 rounded-xl min-h-[36px]',
        md: 'text-sm px-5 py-2.5 rounded-xl min-h-[40px]',
        lg: 'text-sm px-6 py-3 rounded-xl min-h-[46px]',
        icon: 'p-2 rounded-xl min-h-[40px] min-w-[40px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" color="white" className="shrink-0" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

export { buttonVariants }
