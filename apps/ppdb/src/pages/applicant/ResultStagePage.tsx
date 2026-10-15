import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import LoaResultStep from './components/LoaResultStep'
import { Skeleton } from '@/components/ui'

export default function ResultStagePage() {
  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const loaQuery = useQuery({
    queryKey: ['my-loa'],
    queryFn: async () => {
      const res = await apiFetch<any>('/ppdb/applicants/me/loa').catch(() => null)
      return res?.letter_number ? res : (res?.loa || null)
    },
  })

  const selectionQuery = useQuery({
    queryKey: ['my-selection'],
    queryFn: async () => {
      const res = await apiFetch<any>('/selection/applicants/me/results').catch(() => null)
      return res || null
    },
  })

  const applicant = transactionQuery.data?.applicant
  const loa = loaQuery.data
  const isLoading = transactionQuery.isLoading || loaQuery.isLoading

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Hasil Kelulusan & LoA"
          description="Pengumuman resmi hasil seleksi penerimaan santri baru beserta dokumen Letter of Acceptance (LoA)."
          docKey="applicant-result"
        />

        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <LoaResultStep
              applicant={applicant}
              selectionResult={selectionQuery.data ?? null}
              loa={loa}
            />
          </div>
        )}
      </main>
    </div>
  )
}
