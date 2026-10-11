import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import ApplicantTopBar from '@/components/shared/ApplicantTopBar'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import { Button, Skeleton } from '@/components/ui'
import { Share2, MessageCircle, Copy, Check } from 'lucide-react'

export default function ApplicantReceiptPage() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const transactionQuery = useQuery({
    queryKey: ['my-transaction'],
    queryFn: () => apiFetch<any>('/payment/my-transaction'),
  })

  const applicant = transactionQuery.data?.applicant
  const transaction = transactionQuery.data?.transaction
  const isLoading = transactionQuery.isLoading

  const transactionId = transaction?.id || applicant?.id || '00000000'
  const receiptNo = `KUI-PPDB-${transactionId.slice(0, 8).toUpperCase()}`
  const shareUrl = `${window.location.origin}/kuitansi/${transactionId}`

  // Kuitansi terisi dari applicant dan/atau transaction
  const receiptData: ReceiptData | null = applicant ? {
    id: transactionId,
    receipt_no: receiptNo,
    applicant_name: applicant?.full_name || 'Calon Santri',
    registration_path: (applicant?.registration_path || 'Reguler').toUpperCase(),
    amount: transaction?.amount || 250000,
    payment_method: (transaction?.method || 'QRIS').toUpperCase(),
    payment_date: transaction?.updated_at || transaction?.created_at || applicant?.created_at,
    status: transaction?.status || applicant?.payment_status || 'paid',
    is_paid: true,
  } : null

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast('success', 'Link kuitansi berhasil disalin ke clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('error', 'Gagal menyalin link kuitansi')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kuitansi Pembayaran Formulir PPDB Ar-Rahman',
          text: `Kuitansi Pembayaran Formulir PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman atas nama ${applicant?.full_name || 'Calon Santri'}:\n${shareUrl}`,
          url: shareUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*KUITANSI PEMBAYARAN FORMULIR PPDB AR-RAHMAN*\n\nNama: ${applicant?.full_name || 'Calon Santri'}\nNo. Kuitansi: ${receiptNo}\nStatus: *LUNAS*\n\nBuka kuitansi digital sah di tautan berikut:\n${shareUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ApplicantTopBar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
        <ApplicantPageHeader
          title="Kuitansi Pembayaran Formulir"
          description="Bukti pembayaran sah pendaftaran calon santri baru Pesantren Tahfidz Qur'an dan Digital Ar-Rahman."
          docKey="applicant-payment"
          action={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                size="sm"
                onClick={handleShare}
                className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-9 text-xs font-semibold shadow-2xs cursor-pointer flex-1 sm:flex-none"
              >
                <Share2 className="h-3.5 w-3.5" />
                Bagikan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleWhatsApp}
                className="gap-1.5 h-9 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-white cursor-pointer flex-1 sm:flex-none"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="gap-1.5 h-9 text-xs font-semibold bg-white cursor-pointer flex-1 sm:flex-none"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Tersalin' : 'Salin Link'}
              </Button>
            </div>
          }
        />

        {/* Content */}
        {isLoading && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-sm space-y-6">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {receiptData ? (
          <div className="animate-in fade-in duration-200">
            <OfficialReceiptCard receipt={receiptData} />
          </div>
        ) : !isLoading ? (
          <div className="max-w-md mx-auto text-center p-8 bg-white rounded-3xl border border-slate-200 space-y-3">
            <p className="font-semibold text-slate-800">Data pendaftaran sedang dimuat</p>
            <p className="text-xs text-slate-500">Silakan muat ulang halaman jika kuitansi belum tampil.</p>
          </div>
        ) : null}
      </main>
    </div>
  )
}
