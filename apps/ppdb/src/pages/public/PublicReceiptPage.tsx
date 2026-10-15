import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import { Skeleton } from '@/components/ui'
import { AlertCircle } from 'lucide-react'

export default function PublicReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const receiptQuery = useQuery({
    queryKey: ['public-receipt', id, token],
    queryFn: () => {
      const endpoint = token
        ? `/payment/public-receipt/${id}?token=${encodeURIComponent(token)}`
        : `/payment/public-receipt/${id}`
      return apiFetch<ReceiptData>(endpoint)
    },
    enabled: Boolean(id),
  })

  const receipt = receiptQuery.data
  const isLoading = receiptQuery.isLoading
  const isError = receiptQuery.isError

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-center">
      {isLoading && (
        <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md text-center space-y-4 border border-red-100">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">Kuitansi Tidak Ditemukan</h2>
            <p className="text-sm text-slate-500 mt-1">
              Data kuitansi dengan nomor atau ID yang Anda cari tidak tersedia atau belum terbit.
            </p>
          </div>
        </div>
      )}

      {receipt && (
        <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200">
          <OfficialReceiptCard receipt={receipt} />
        </div>
      )}
    </div>
  )
}
