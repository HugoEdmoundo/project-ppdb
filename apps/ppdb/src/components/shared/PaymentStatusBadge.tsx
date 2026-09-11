import { cn } from '@/lib/utils'

const styles: Record<string, { label: string; cls: string; dot: string }> = {
  paid: { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
  partial: { label: 'Sebagian', cls: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200', dot: 'bg-sky-500' },
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
  expired: { label: 'Kadaluarsa', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200', dot: 'bg-red-500' },
}

export default function PaymentStatusBadge({ status }: { status?: string }) {
  const style = styles[status || 'pending'] || styles.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', style.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  )
}
