import { Input } from '../ui/Input'
import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  prefixIcon?: React.ReactNode
}

export function FormField({ label, error, helperText, ...props }: FormFieldProps) {
  return <Input label={label} error={error} helperText={helperText} {...props} />
}
