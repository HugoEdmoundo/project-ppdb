import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import DocumentUploadStep from './components/DocumentUploadStep'
import { ConfirmDialog, Skeleton } from '@/components/ui'

export default function ApplicantDocumentsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const documentsQuery = useQuery({
    queryKey: ['my-documents'],
    queryFn: () => apiFetch<any>('/ppdb/documents'),
  })

  const applicant = transactionQuery.data?.applicant
  const documents = documentsQuery.data?.data || []
  const requiredDocuments = documentsQuery.data?.required_documents || []
  const isLoading = transactionQuery.isLoading || documentsQuery.isLoading

  const submitDocsMutation = useMutation({
    mutationFn: () => apiFetch('/ppdb/documents/submit', { method: 'POST' }),
    onSuccess: () => {
      toast('success', 'Dokumen berhasil dikirim untuk verifikasi')
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      queryClient.invalidateQueries({ queryKey: ['my-documents'] })
      navigate('/applicant')
    },
    onError: (e: any) => toast('error', e.message || 'Gagal mengirim dokumen'),
    onSettled: () => setShowSubmitConfirm(false),
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Upload & Kirim Dokumen"
          description="Unggah berkas persyaratan wajib dan berkas pendukung sesuai jalur pendaftaran Anda."
          docKey="applicant-documents"
        />

        {isLoading ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
            <DocumentUploadStep
              applicant={applicant}
              documents={documents}
              requiredDocuments={requiredDocuments}
              onDocumentsChange={() => queryClient.invalidateQueries({ queryKey: ['my-documents'] })}
              onSubmitRequest={() => setShowSubmitConfirm(true)}
            />
          </div>
        )}

        <ConfirmDialog
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          onConfirm={() => {
            setShowSubmitConfirm(false)
            submitDocsMutation.mutate()
          }}
          loading={submitDocsMutation.isPending}
          title="Kirim Dokumen"
          message="Apakah Anda yakin semua dokumen sudah benar? Dokumen yang sudah dikirim tidak bisa diubah kembali."
          confirmLabel="Kirim"
        />
      </main>
    </div>
  )
}
