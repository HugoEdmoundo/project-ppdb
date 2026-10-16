import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui"
import { ArrowRight, Activity, ClipboardCheck, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'
import ApplicantDocumentsAdmin from '@/components/shared/ApplicantDocumentsAdmin'
import { cn } from '@/lib/utils'

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot?: string }> = {
    document_uploaded: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_uploaded_pending: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', dot: 'bg-amber-500' },
    document_approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
    document_rejected: { label: 'Ditolak (Perlu Revisi)', cls: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200', dot: 'bg-red-500' },
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

export default function VerifikasiDokumenPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants-docs', searchQuery, page, limit, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      // Hanya pendaftar dari PERIODE aktif (seluruh gelombang di dalamnya).
      qs.append('period_id', 'active')

      const res = await api.apiFetch<{ data: Applicant[], total: number, active_period: any }>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const activePeriodData = data?.active_period && typeof data.active_period === 'object' ? data.active_period : null
  const hasActivePeriod = !!activePeriodData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleFilterChange = (status: string) => {
    if (status) {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Verifikasi Dokumen"
        description="Pemeriksaan kelengkapan dan keabsahan dokumen persyaratan calon santri."
        loading={loading}
        docKey="ppdb-verifikasi-dokumen"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Periode Aktif', value: activePeriodData?.name || 'Tidak ada', active: hasActivePeriod, pulse: hasActivePeriod },
          { icon: ClipboardCheck, label: 'Total Pendaftar', value: data?.total != null ? `${data.total} berkas` : '—', active: true },
        ]}
      />

      {!loading && hasActivePeriod === false && (
        <NoActiveWaveBanner message="Tidak ada periode yang aktif saat ini. Aktifkan periode terlebih dahulu untuk memverifikasi dokumen." />
      )}

      {/* Filter Tabs / Quick Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full"
          onClick={() => handleFilterChange('')}
        >
          Semua Dokumen
        </Button>
        <Button
          variant={statusFilter === 'document_uploaded' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('document_uploaded')}
        >
          <Clock className="h-3.5 w-3.5" /> Menunggu Verifikasi
        </Button>
        <Button
          variant={statusFilter === 'document_approved' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('document_approved')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Disetujui
        </Button>
        <Button
          variant={statusFilter === 'document_rejected' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('document_rejected')}
        >
          <XCircle className="h-3.5 w-3.5" /> Ditolak / Revisi
        </Button>
      </div>

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-emerald-primary/5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Nama Pendaftar</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Email / No. WA</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Jalur Pendaftaran</th>
                  <th className="py-3 px-4 text-left whitespace-nowrap">Status Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={4} className="py-4 px-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : applicants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                      Tidak ada pendaftar yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() => setSelectedApplicant(applicant)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      title="Klik untuk periksa dan verifikasi dokumen"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{applicant.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{applicant.wave_name || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{applicant.email || '-'}</div>
                        <div className="text-xs text-muted-foreground">{applicant.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize text-xs font-medium">
                          {applicant.registration_path || '-'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <DocStatusBadge status={applicant.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Dialog Pemeriksaan Dokumen */}
      <Dialog open={!!selectedApplicant} onOpenChange={(v) => !v && setSelectedApplicant(null)}>
        <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen: {selectedApplicant?.full_name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Periksa berkas persyaratan yang diunggah. Dokumen yang ditolak akan di-reset dari sistem sehingga santri dapat mengunggah ulang.
            </DialogDescription>
          </DialogHeader>

          {selectedApplicant && (
            <div className="mt-2">
              <ApplicantDocumentsAdmin
                applicantId={selectedApplicant.id}
                currentStatus={selectedApplicant.status}
                onVerified={() => {
                  refetch()
                  setSelectedApplicant(null)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
