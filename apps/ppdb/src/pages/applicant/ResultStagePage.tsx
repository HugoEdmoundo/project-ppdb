import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import ResultStep from './components/ResultStep'
import { Skeleton } from '@/components/ui'

export default function ResultStagePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

  const stage2Query = useQuery({
    queryKey: ['my-stage2-bills'],
    queryFn: async () => {
      const res = await apiFetch<any>('/payment/stage2/my-bills').catch(() => ({ bills: [], mou_signed: false }))
      return res?.bills || []
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
  const stage2Bills = stage2Query.data || []
  const isLoading = transactionQuery.isLoading || loaQuery.isLoading

  const uploadProofMutation = useMutation({
    mutationFn: ({ billId, file }: { billId: string, file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch(`/payment/stage2/bills/${billId}/upload-proof`, { method: 'POST', body: formData })
    },
    onSuccess: () => {
      toast('success', 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.')
      queryClient.invalidateQueries({ queryKey: ['my-stage2-bills'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal upload bukti'),
  })

  const handleUploadProof = (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Ukuran file maksimal 5MB')
      e.target.value = ''
      return
    }
    uploadProofMutation.mutate({ billId, file })
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Hasil Kelulusan & LoA"
          description="Pengumuman resmi hasil seleksi penerimaan santri baru beserta dokumen LoA dan tahapan daftar ulang."
          docKey="applicant-result"
        />

        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <ResultStep
              applicant={applicant}
              selectionResult={selectionQuery.data ?? null}
              loa={loa}
              stage2Bills={stage2Bills}
              onUploadProof={handleUploadProof}
            />
          </div>
        )}
      </main>
    </div>
  )
}
