import * as React from 'react'
import { cn } from '@/app/lib/utils'
import { Label } from './Label'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <Label htmlFor={id} className="mb-1.5 block">
          {label}
        </Label>
      )}
      <textarea
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={cn(
          'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea'

export { Textarea }
