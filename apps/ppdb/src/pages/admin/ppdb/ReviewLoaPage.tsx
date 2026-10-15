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
  Button,
  Input,
  TableSkeletonRows,
  EmptyState,
} from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import PaginationControls from '@/components/shared/PaginationControls'
import {
  FileCheck2,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

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
        page: number
        per_page: number
      }>(`/ppdb/signed-loa-applicants?${params.toString()}`)
    },
  })

  const applicants = data?.data || []
  const total = data?.total || 0

  const handleRowClick = (applicant: any) => {
    const targetUrl = `/loa/${applicant.registration_number || applicant.id}`
    window.open(targetUrl, '_blank')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Review LoA Ditandatangani"
        description="Daftar calon santri yang telah melakukan konfirmasi tanda tangan digital dua pihak (Orang Tua / Wali). Klik baris data untuk langsung membuka dokumen resmi LoA PDF."
        docKey="ppdb-review-loa"
        blocks={[
          {
            icon: FileCheck2,
            label: 'Total LoA Ditandatangani',
            value: `${total} santri`,
            active: true,
          },
          {
            icon: ShieldCheck,
            label: 'Konfirmasi 2 Pihak',
            value: `${total} terverifikasi`,
            active: total > 0,
            pulse: total > 0,
          },
        ]}
      />

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
              Menampilkan {applicants.length} dari {total} data pendaftar bertanda tangan
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="text-xs">No. Registrasi</TableHead>
                  <TableHead className="text-xs">Nama Calon Santri</TableHead>
                  <TableHead className="text-xs">Jalur & Gelombang</TableHead>
                  <TableHead className="text-xs">Penandatangan (Orang Tua / Wali)</TableHead>
                  <TableHead className="text-xs">Waktu Tanda Tangan</TableHead>
                  <TableHead className="text-xs text-center">Status Konfirmasi</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows cols={8} rows={5} />
                ) : applicants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12">
                      <EmptyState
                        icon={FileCheck2}
                        title="Belum Ada LoA Ditandatangani"
                        description={
                          debouncedSearch
                            ? 'Tidak ada data pendaftar bertanda tangan yang cocok dengan pencarian Anda.'
                            : 'Belum ada calon santri lulus yang menyelesaikan tanda tangan digital orang tua/wali.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  applicants.map((app, index) => (
                    <TableRow
                      key={app.id}
                      onClick={() => handleRowClick(app)}
                      className="cursor-pointer hover:bg-emerald-50/40 transition-colors group"
                      title="Klik untuk membuka dokumen resmi LoA PDF"
                    >
                      <TableCell className="text-center text-xs text-slate-500 font-medium">
                        {(page - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">
                        {app.registration_number || app.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">
                          {app.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.previous_school || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        <span className="font-medium text-slate-700 uppercase">
                          {app.registration_path || 'Reguler'}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {app.wave_name || 'Gelombang 1'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">
                          {app.loa_signer_name || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Hubungan: {app.loa_signer_relation || 'Orang Tua / Wali'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
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
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant="success"
                          className="gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Sah 2 Pihak
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowClick(app)
                          }}
                          className="h-7 px-2.5 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Buka LoA</span>
                        </Button>
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
