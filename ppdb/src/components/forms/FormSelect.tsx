import { SelectField } from '../ui/Select'
import type { SelectOption } from '../ui/Select'

interface FormSelectProps {
  label?: string
  error?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: SelectOption[]
  disabled?: boolean
  id?: string
  name?: string
  required?: boolean
}

export function FormSelect({
  label,
  error,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  options,
  disabled,
  id,
  name,
  required,
}: FormSelectProps) {
  return (
    <SelectField
      label={label}
      error={error}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      placeholder={placeholder}
      options={options}
      disabled={disabled}
      id={id}
      name={name}
      required={required}
    />
  )
}
