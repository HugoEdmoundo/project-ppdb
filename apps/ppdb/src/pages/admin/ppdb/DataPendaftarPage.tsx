import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import {
  Card,
  CardContent,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import {
  ArrowRight,
  Activity,
  Users,
  X,
  FileDown,
  FileText,
  Printer,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import ApplicantProfileModal from '@/components/shared/ApplicantProfileModal'
import ApplicantsTable from '@/components/shared/ApplicantsTable'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'
import { useToast } from '@/components/Toast'
import {
  exportAllApplicantsToWord,
  exportAllApplicantsToPdf,
} from '@/utils/exportApplicantForm'

export default function DataPendaftarPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [isExporting, setIsExporting] = useState<'word' | 'pdf' | null>(null)

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants', searchQuery, page, limit, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      // Halaman admin PPDB hanya menampilkan pendaftar dari PERIODE aktif
      // (seluruh gelombang di dalamnya).
      qs.append('period_id', 'active')

      const res = await api.apiFetch<{ data: Applicant[]; total: number; active_period: any }>(
        `/ppdb/applicants?${qs.toString()}`
      )
      return res
    },
  })

  const applicants = data?.data || []
  const activePeriodData =
    data?.active_period && typeof data.active_period === 'object' ? data.active_period : null
  const hasActivePeriod = !!activePeriodData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  // Handler ekspor seluruh data formulir pendaftar (Word / PDF)
  const handleExport = async (format: 'word' | 'pdf') => {
    try {
      setIsExporting(format)
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', '1')
      qs.append('perPage', '2000') // Tarik semua pendaftar periode aktif
      qs.append('period_id', 'active')

      const res = await api.apiFetch<{ data: Applicant[]; total: number; active_period: any }>(
        `/ppdb/applicants?${qs.toString()}`
      )
      const allApplicants = res?.data || []

      if (allApplicants.length === 0) {
        toast('error', 'Tidak ada data pendaftar yang dapat diekspor.')
        return
      }

      const periodName =
        activePeriodData?.name || res.active_period?.name || 'Periode PPDB Aktif'
      const committeeHead =
        activePeriodData?.head_of_committee ||
        res.active_period?.head_of_committee ||
        'Ust. Wijaya Kurnia, M.Pd.'

      if (format === 'word') {
        exportAllApplicantsToWord(allApplicants, periodName, committeeHead)
        toast(
          'success',
          `Berhasil mengekspor ${allApplicants.length} data formulir pendaftar ke dokumen Microsoft Word (.doc)`
        )
      } else {
        exportAllApplicantsToPdf(allApplicants, periodName, committeeHead)
        toast(
          'success',
          `Menyiapkan dokumen cetak PDF untuk ${allApplicants.length} formulir pendaftar...`
        )
      }
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengekspor data pendaftar.')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Data Pendaftar"
        description="Kelola data biodata lengkap calon santri yang telah mendaftar."
        loading={loading}
        docKey="ppdb-data-pendaftar"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          {
            icon: Activity,
            label: 'Periode Aktif',
            value: activePeriodData?.name || 'Tidak ada',
            active: hasActivePeriod,
            pulse: hasActivePeriod,
          },
          {
            icon: Users,
            label: 'Total Pendaftar',
            value: data?.total != null ? `${data.total} terdaftar` : '—',
            active: true,
          },
        ]}
      />

      {!loading && hasActivePeriod === false && (
        <NoActiveWaveBanner message="Tidak ada periode yang aktif saat ini. Aktifkan periode terlebih dahulu untuk menampilkan data pendaftar." />
      )}

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        searchActions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!!isExporting}
                className="h-10 shrink-0 rounded-full px-3.5 sm:px-4 font-semibold text-xs sm:text-sm bg-white border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-xs cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Mengekspor...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 text-emerald-600" />
                    <span>Export Data</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 p-1.5 shadow-lg border-slate-200 bg-white">
              <DropdownMenuItem
                onClick={() => handleExport('word')}
                disabled={!!isExporting}
                className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-slate-900">Dokumen Word (.doc)</span>
                  <span className="text-[10px] text-slate-500">
                    Rekap formulir lengkap semua pendaftar
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                disabled={!!isExporting}
                className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Printer className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-slate-900">Dokumen PDF (.pdf)</span>
                  <span className="text-[10px] text-slate-500">
                    Lembar cetak lanskap semua pendaftar
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {statusFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Badge
            variant={statusFilter === 'expired' ? 'destructive' : 'secondary'}
            className="uppercase"
          >
            {statusFilter}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setSearchParams({})
              setPage(1)
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Hapus filter
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ApplicantsTable
            applicants={applicants}
            loading={loading}
            hasActivePeriod={hasActivePeriod}
            showSelectionColumn
            onRowClick={setSelectedApplicant}
          />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <ApplicantProfileModal
        open={!!selectedApplicant}
        onOpenChange={(v) => !v && setSelectedApplicant(null)}
        applicant={selectedApplicant}
      />
    </div>
  )
}
