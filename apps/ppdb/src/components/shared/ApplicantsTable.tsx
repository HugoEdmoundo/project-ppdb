import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { UserRoundSearch, Waves, ChevronRight } from 'lucide-react'
import PaymentStatusBadge from './PaymentStatusBadge'
import { cn } from '@/lib/utils'

interface ApplicantsTableProps {
  applicants: any[]
  loading: boolean
  hasActiveWave: boolean | null
  showSelectionColumn?: boolean
  onRowClick?: (applicant: any) => void
}

function initials(name?: string) {
  return (name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot?: string }> = {
    document_uploaded: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_uploaded_pending: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
    document_rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200', dot: 'bg-red-500' },
  }
  const resolved = ['passed', 'failed', 'selection'].includes(status)
    ? map.document_approved
    : map[status] || { label: (status || '-').replace('_', ' '), cls: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200', dot: 'bg-slate-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', resolved.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', resolved.dot)} />
      {resolved.label}
    </span>
  )
}

function SelectionStatusBadge({ status }: { status?: string }) {
  if (status === 'passed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Lulus
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Tidak Lulus
      </span>
    )
  if (status === 'selection')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Seleksi
      </span>
    )
  return <span className="text-sm text-slate-400">—</span>
}

export default function ApplicantsTable({ applicants, loading, hasActiveWave, showSelectionColumn = false, onRowClick }: ApplicantsTableProps) {
  const cols = showSelectionColumn ? 7 : 6

  return (
    <Table>
      <TableHeader className="bg-emerald-primary/5">
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama Pendaftar</TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email / No. WA</TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jalur / Jenjang</TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pembayaran</TableHead>
          <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dokumen</TableHead>
          {showSelectionColumn && (
            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Seleksi</TableHead>
          )}
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableSkeletonRows cols={cols + 1} rows={6} />
        ) : applicants.length === 0 ? (
          <TableRow>
            <TableCell colSpan={cols + 1} className="py-8">
              <EmptyState
                icon={hasActiveWave === false ? Waves : UserRoundSearch}
                title={hasActiveWave === false ? "Tidak Ada Gelombang Aktif" : "Belum Ada Pendaftar"}
                description={
                  hasActiveWave === false
                    ? "Aktifkan gelombang terlebih dahulu untuk menampilkan data."
                    : "Belum ada pendaftar yang sesuai kriteria pencarian."
                }
                className="bg-transparent border-transparent"
              />
            </TableCell>
          </TableRow>
        ) : (
          applicants.map((a) => (
            <TableRow
              key={a.id}
              onClick={() => onRowClick?.(a)}
              className={cn(
                'group transition-colors',
                onRowClick && 'cursor-pointer hover:bg-emerald-primary/5'
              )}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-primary to-emerald-dark text-xs font-bold text-white shadow-sm shadow-emerald-primary/20">
                    {initials(a.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{a.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{a.wave_name || '-'}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {a.email}
                <br />
                <span className="text-xs text-muted-foreground">{a.phone}</span>
              </TableCell>
              <TableCell className="text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                  {a.registration_path}{a.registration_level ? ` · ${a.registration_level.toUpperCase()}` : ''}
                </span>
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={a.payment_status} />
              </TableCell>
              <TableCell>
                <DocStatusBadge status={a.status} />
              </TableCell>
              {showSelectionColumn && (
                <TableCell>
                  <SelectionStatusBadge status={a.status} />
                </TableCell>
              )}
              <TableCell>
                {onRowClick && (
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}