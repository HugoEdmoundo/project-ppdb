import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import SelectionStep from './components/SelectionStep'
import { Skeleton } from '@/components/ui'

interface SelectionStagePageProps {
  section: 'tiu' | 'tahfidz' | 'interview'
  title: string
  subtitle: string
}

export default function SelectionStagePage({ section, title, subtitle }: SelectionStagePageProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const selectionQuery = useQuery({
    queryKey: ['my-selection'],
    queryFn: async () => {
      const [resultRes, sessionRes] = await Promise.all([
        apiFetch<any>('/selection/applicants/me/results'),
        apiFetch<any>('/selection/applicants/me/sessions'),
      ])
      return {
        result: resultRes || null,
        sessionData: sessionRes || null,
      }
    },
  })

  const applicant = transactionQuery.data?.applicant
  const isLoading = transactionQuery.isLoading || selectionQuery.isLoading

  const bookMutation = useMutation({
    mutationFn: (sessionId: string) => apiFetch('/selection/applicants/me/book', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),
    onSuccess: () => {
      toast('success', 'Berhasil memilih jadwal ujian')
      queryClient.invalidateQueries({ queryKey: ['my-selection'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal memilih jadwal'),
  })

  const handleBookSession = (sessionId: string) => {
    if (!window.confirm('Anda yakin ingin memilih jadwal ini?')) return
    bookMutation.mutate(sessionId)
  }

  const docKeyMap = {
    tiu: 'applicant-tiu',
    tahfidz: 'applicant-tahfidz',
    interview: 'applicant-interview',
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title={title}
          description={subtitle}
          docKey={docKeyMap[section]}
        />

        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <SelectionStep
              applicant={applicant}
              sessionData={selectionQuery.data?.sessionData ?? null}
              selectionResult={selectionQuery.data?.result ?? null}
              booking={bookMutation.isPending}
              onBookSession={handleBookSession}
              section={section}
            />
          </div>
        )}
      </main>
    </div>
  )
}
