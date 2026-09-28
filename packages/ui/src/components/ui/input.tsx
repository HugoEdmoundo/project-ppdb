import * as React from 'react'
import { cn } from '../../lib/utils'
import { Label } from './label'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, onChange, inputMode, min, step, ...props }, ref) => {
    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const raw = event.currentTarget.value
      let value = raw
      if (type === 'tel' || inputMode === 'numeric') {
        value = raw.replace(/\D/g, '')
      } else if (type === 'number' || inputMode === 'decimal') {
        const decimal = inputMode === 'decimal' || step === 'any' || (typeof step === 'string' && step.includes('.')) || (typeof step === 'number' && !Number.isInteger(step))
        const negative = min !== undefined && Number(min) < 0
        value = raw.replace(decimal ? /[^\d.\-]/g : /[^\d\-]/g, '')
        if (!negative) value = value.replace(/-/g, '')
        else value = value.replace(/(?!^)-/g, '')
        if (decimal) {
          const dot = value.indexOf('.')
          if (dot >= 0) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '')
        }
      }
      if (value !== raw) event.currentTarget.value = value
      onChange?.(event)
    }
    return (
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
        inputMode={inputMode}
        min={min}
        step={step}
        aria-invalid={!!error}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive/60',
          className
        )}
        {...props}
        onChange={handleChange}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
