import * as React from 'react'
import { cn } from '../../lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onValueChange: (value: number) => void
  prefix?: string
}

const formatThousands = (digits: string): string =>
  new Intl.NumberFormat('id-ID').format(parseInt(digits, 10))

/**
 * Input nominal uang: tampil dengan pemisah ribuan (id-ID) + prefix Rp,
 * menerima digit saja dan mengembalikan angka murni via onValueChange.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, prefix = 'Rp', className, maxLength = 15, ...props }, ref) => (
    <div className="relative w-full">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value > 0 ? formatThousands(String(value)) : ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, maxLength)
          onValueChange(digits ? parseInt(digits, 10) : 0)
        }}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          prefix && 'pl-10',
          className
        )}
        {...props}
      />
    </div>
  )
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
