import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
  Input,
  TableSkeletonRows,
  EmptyState,
} from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import PaginationControls from '@/components/shared/PaginationControls'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import { FileCheck2, Search, Clock, CheckCircle2 } from 'lucide-react'

export default function ReviewLoaPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  // Search debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearch(val)
    setPage(1)
    clearTimeout((window as any)._loaSearchTimer)
    ;(window as any)._loaSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
    }, 350)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['signed-loa-applicants', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', page.toString())
      params.set('per_page', perPage.toString())
      return await apiFetch<{
        data: any[]
        total: number
        grand_total: number
        signed_count: number
        pending_count: number
        page: number
        per_page: number
        active_period: { id: string; name: string } | null
      }>(`/ppdb/signed-loa-applicants?${params.toString()}`)
    },
  })

  const applicants = data?.data || []
  const total = data?.total || 0
  const grandTotal = data?.grand_total ?? total
  const signedCount = data?.signed_count ?? 0
  const pendingCount = data?.pending_count ?? 0
  const activePeriod = data?.active_period && typeof data.active_period === 'object' ? data.active_period : null
  const hasActivePeriod = !!activePeriod

  const handleRowClick = (applicant: any) => {
    const targetUrl = `/loa/${applicant.registration_number || applicant.id}`
    window.open(targetUrl, '_blank')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Review LoA Calon Santri"
        description="Daftar calon santri penerima Surat Penerimaan (LoA) pada periode aktif — baik yang sudah menandatangani secara digital bersama orang tua/wali maupun yang masih menunggu tanda tangan. Klik baris data untuk membuka dokumen resmi LoA."
        docKey="ppdb-review-loa"
        blocks={[
          {
            icon: FileCheck2,
            label: 'Total Penerima LoA',
            value: `${grandTotal} santri`,
            active: true,
          },
          {
            icon: Clock,
            label: 'Menunggu Tanda Tangan',
            value: `${pendingCount} santri`,
            active: pendingCount > 0,
            pulse: pendingCount > 0,
          },
          {
            icon: CheckCircle2,
            label: 'Sudah Ditandatangani',
            value: `${signedCount} terverifikasi`,
            active: signedCount > 0,
          },
        ]}
      />

      {!isLoading && hasActivePeriod === false && (
        <NoActiveWaveBanner message="Tidak ada periode yang aktif saat ini. Aktifkan periode terlebih dahulu untuk menampilkan penerima LoA." />
      )}

      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={handleSearchChange}
                placeholder="Cari nama, no. registrasi, orang tua..."
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan {applicants.length} dari {total} penerima LoA
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <Table className="w-full min-w-[680px] lg:min-w-0 lg:table-fixed">
              <colgroup>
                <col className="lg:w-[16%]" />
                <col className="lg:w-[25%]" />
                <col className="lg:w-[15%]" />
                <col className="lg:w-[15%]" />
                <col className="lg:w-[17%]" />
                <col className="lg:w-[12%]" />
              </colgroup>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="px-2 text-xs">No. Reg</TableHead>
                  <TableHead className="px-2 text-xs">Nama</TableHead>
                  <TableHead className="px-2 text-xs">Jalur</TableHead>
                  <TableHead className="px-2 text-xs">Penandatangan</TableHead>
                  <TableHead className="px-2 text-xs">Ditandatangani</TableHead>
                  <TableHead className="px-2 text-center text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows cols={6} rows={5} />
                ) : applicants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <EmptyState
                        icon={FileCheck2}
                        title="Belum Ada Penerima LoA"
                        description={
                          debouncedSearch
                            ? 'Tidak ada data penerima LoA yang cocok dengan pencarian Anda.'
                            : 'Belum ada calon santri yang dinyatakan lulus dan menerima Surat Penerimaan (LoA).'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  applicants.map((app) => (
                    <TableRow
                      key={app.id}
                      onClick={() => handleRowClick(app)}
                      className="cursor-pointer hover:bg-emerald-50/40 transition-colors group"
                      title="Klik untuk membuka dokumen resmi LoA"
                    >
                      <TableCell className="px-2 py-3">
                        <div
                          className="truncate font-mono text-xs font-bold text-indigo-700"
                          title={app.registration_number || app.id.slice(0, 8).toUpperCase()}
                        >
                          {app.registration_number || app.id.slice(0, 8).toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <div className="truncate text-xs font-semibold text-slate-900" title={app.full_name}>
                          {app.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <div
                          className="truncate text-xs font-medium uppercase text-slate-700"
                          title={`${app.registration_path || 'Reguler'} · ${app.wave_name || 'Gelombang 1'}`}
                        >
                          {app.registration_path || 'Reguler'}
                          <span className="font-normal normal-case text-slate-400">
                            {' · '}{app.wave_name || 'Gelombang 1'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <div
                          className="truncate text-xs text-slate-800"
                          title={app.loa_signer_name || '-'}
                        >
                          {app.loa_signer_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {app.loa_signed_at
                          ? new Date(app.loa_signed_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center whitespace-nowrap">
                        {app.is_loa_signed ? (
                          <Badge
                            variant="success"
                            className="gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Sah 2 Pihak
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-300"
                          >
                            <Clock className="h-3 w-3 text-amber-600" />
                            Menunggu
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > perPage && (
            <div className="pt-2">
              <PaginationControls
                page={page}
                totalPages={Math.ceil(total / perPage)}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
