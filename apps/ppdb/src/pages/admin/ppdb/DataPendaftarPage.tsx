import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '@/api/client'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { ArrowRight, Activity, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import ApplicantProfileModal from '@/components/shared/ApplicantProfileModal'
import ApplicantsTable from '@/components/shared/ApplicantsTable'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'

export default function DataPendaftarPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants', searchQuery, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())

      const res = await api.apiFetch<{ data: Applicant[], total: number, active_wave: any }>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Data Pendaftar"
        description="Kelola data biodata lengkap calon santri yang telah mendaftar."
        loading={loading}
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveData?.name || 'Tidak ada', active: hasActiveWave, pulse: hasActiveWave },
          { icon: Users, label: 'Total Pendaftar', value: data?.total != null ? `${data.total} terdaftar` : '—', active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk menampilkan data pendaftar." />
      )}

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <Card>
        <CardContent className="p-0">
          <ApplicantsTable
            applicants={applicants}
            loading={loading}
            hasActiveWave={hasActiveWave}
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