import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './Label'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <Label htmlFor={id} className="mb-1.5 block">
          {label}
        </Label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        aria-invalid={!!error}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive/60',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
)
Input.displayName = 'Input'

export { Input }
