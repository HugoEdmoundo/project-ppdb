import { Textarea } from '../ui/Textarea'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function FormTextarea({ label, error, helperText, ...props }: FormTextareaProps) {
  return <Textarea label={label} error={error} helperText={helperText} {...props} />
}
