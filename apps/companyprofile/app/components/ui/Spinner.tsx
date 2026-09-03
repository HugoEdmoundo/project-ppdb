import { cn } from '@/app/lib/utils'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'emerald' | 'gold' | 'white' | 'slate'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'emerald', className }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  }

  const colors = {
    emerald: 'border-emerald-primary/20 border-t-emerald-primary',
    gold: 'border-gold-accent/20 border-t-gold-accent',
    white: 'border-white/20 border-t-white',
    slate: 'border-slate/20 border-t-slate-dark',
  }

  return (
    <div
      className={cn('inline-block rounded-full animate-spin', sizes[size], colors[color], className)}
      role="status"
      aria-label="Loading"
    />
  )
}
