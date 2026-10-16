import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { TableSkeletonRows } from "@/components/ui"
import { UserRoundSearch, Waves, ChevronRight } from 'lucide-react'
import PaymentStatusBadge from './PaymentStatusBadge'
import { cn } from '@/lib/utils'

interface ApplicantsTableProps {
  applicants: any[]
  loading: boolean
  hasActivePeriod: boolean | null
  showSelectionColumn?: boolean
  onRowClick?: (applicant: any) => void
}


/** Ubah nilai snake_case/kebab-case menjadi label yang rapi. */
function humanize(value?: string | null) {
  if (!value) return ''
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot?: string; title?: string }> = {
    document_uploaded: { label: 'Menunggu', title: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_uploaded_pending: { label: 'Menunggu', title: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
    document_rejected: { label: 'Ditolak', title: 'Ditolak — perlu revisi', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200', dot: 'bg-red-500' },
  }
  const resolved = ['passed', 'failed', 'selection'].includes(status)
    ? map.document_approved
    : map[status] || { label: humanize(status) || '-', cls: 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200', dot: 'bg-slate-400' }
  return (
    <span
      title={resolved.title}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', resolved.cls)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', resolved.dot)} />
      {resolved.label}
    </span>
  )
}

function SelectionStatusBadge({ status }: { status?: string }) {
  if (status === 'passed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
        Lulus
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
        Tidak Lulus
      </span>
    )
  if (status === 'selection')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        Seleksi
      </span>
    )
  return <span className="text-sm text-slate-300">—</span>
}

const headBase = 'h-11 text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap align-middle'

export default function ApplicantsTable({ applicants, loading, hasActivePeriod, showSelectionColumn = false, onRowClick }: ApplicantsTableProps) {
  const totalCols = showSelectionColumn ? 7 : 6

  return (
    <Table className="w-full min-w-[880px] xl:min-w-0 xl:table-fixed">
      {/*
        Proporsi kolom eksplisit. Di bawah `xl` tabel memakai auto-layout
        (horizontal scroll terkendali) supaya konten tidak saling menekan;
        mulai `xl` tabel dikunci `table-fixed` dengan proporsi di bawah.
      */}
      <colgroup>
        <col className={showSelectionColumn ? 'xl:w-[22%]' : 'xl:w-[29%]'} />
        <col className={showSelectionColumn ? 'xl:w-[20%]' : 'xl:w-[25%]'} />
        <col className={showSelectionColumn ? 'xl:w-[10%]' : 'xl:w-[12%]'} />
        <col className={showSelectionColumn ? 'xl:w-[13%]' : 'xl:w-[14%]'} />
        <col className={showSelectionColumn ? 'xl:w-[15%]' : 'xl:w-[14%]'} />
        {showSelectionColumn && <col className="xl:w-[14%]" />}
        <col className="xl:w-[6%]" />
      </colgroup>
      <TableHeader className="bg-emerald-primary/[0.04] [&_tr]:border-slate-200">
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headBase, 'px-4')}>Pendaftar</TableHead>
          <TableHead className={cn(headBase, 'px-4')}>Kontak</TableHead>
          <TableHead className={cn(headBase, 'px-2.5')}>Jalur</TableHead>
          <TableHead className={cn(headBase, 'px-2.5')}>Pembayaran</TableHead>
          <TableHead className={cn(headBase, 'px-2.5')}>Dokumen</TableHead>
          {showSelectionColumn && <TableHead className={cn(headBase, 'px-2.5')}>Seleksi</TableHead>}
          <TableHead className={cn(headBase, 'px-3 text-right')}>
            <span className="sr-only">Aksi</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableSkeletonRows cols={totalCols} rows={6} />
        ) : applicants.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={totalCols} className="py-8">
              <EmptyState
                icon={hasActivePeriod === false ? Waves : UserRoundSearch}
                title={hasActivePeriod === false ? "Tidak Ada Periode Aktif" : "Belum Ada Pendaftar"}
                description={
                  hasActivePeriod === false
                    ? "Aktifkan periode terlebih dahulu untuk menampilkan data."
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
                'group border-slate-100 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-emerald-primary/[0.05]'
              )}
            >
              {/* Pendaftar */}
              <TableCell className="px-4 py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800" title={a.full_name}>
                    {a.full_name || 'Tanpa Nama'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-xs text-slate-500">
                    <Waves className="h-3 w-3 shrink-0 text-emerald-primary/60" />
                    <span className="truncate">{a.wave_name || 'Tanpa gelombang'}</span>
                  </div>
                </div>
              </TableCell>

              {/* Kontak */}
              <TableCell className="px-4 py-3.5">
                <div className="min-w-0 space-y-0.5">
                  <div className="truncate text-sm font-medium text-slate-700" title={a.email}>
                    {a.email || '—'}
                  </div>
                  <div className="truncate text-xs tabular-nums text-slate-500" title={a.phone}>
                    {a.phone || 'Nomor WA belum diisi'}
                  </div>
                </div>
              </TableCell>

              {/* Jalur */}
              <TableCell className="px-2.5 py-3.5">
                {a.registration_path ? (
                  <span
                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 whitespace-nowrap"
                    title={humanize(a.registration_path)}
                  >
                    {humanize(a.registration_path)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-300">—</span>
                )}
              </TableCell>

              {/* Pembayaran */}
              <TableCell className="px-2.5 py-3.5">
                <PaymentStatusBadge status={a.payment_status} />
              </TableCell>

              {/* Dokumen */}
              <TableCell className="px-2.5 py-3.5">
                <DocStatusBadge status={a.status} />
              </TableCell>

              {/* Seleksi */}
              {showSelectionColumn && (
                <TableCell className="px-2.5 py-3.5">
                  <SelectionStatusBadge status={a.status} />
                </TableCell>
              )}

              {/* Aksi */}
              <TableCell className="px-3 py-3.5 text-right">
                {onRowClick && (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-emerald-primary/10 group-hover:text-primary"
                  >
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
