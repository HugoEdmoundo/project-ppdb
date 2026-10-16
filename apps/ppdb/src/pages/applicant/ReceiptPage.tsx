import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import ApplicantPageHeader from '@/components/shared/ApplicantPageHeader'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import { Button, Skeleton } from '@/components/ui'
import { Share2, MessageCircle, Copy, Check, FileText } from 'lucide-react'

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

  // Kuitansi hanya boleh dirakit dari transaksi yang benar-benar ada.
  // Versi lama tetap merakitnya dari data pendaftar saja: nominal dipatok
  // Rp250.000 (mengabaikan `registration_fee` per gelombang), metode ditebak
  // "QRIS", status kosong menjadi "paid", dan `is_paid` dipatok `true` —
  // sehingga OfficialReceiptCard menampilkan badge "LUNAS" untuk pembayaran
  // yang tidak pernah terjadi, lalu bisa dibagikan ke orang tua lewat WA.
  const hasPayment = !!transaction

  const transactionId = transaction?.id ?? ''
  // Sama seperti PaymentStep: buang tanda hubung UUID dulu supaya dapat 12
  // karakter heksadesimal bersih dan konsisten dengan backend.
  const receiptNo = hasPayment ? `KUI-PPDB-${transactionId.replace(/-/g, '').slice(0, 12).toUpperCase()}` : ''
  const shareUrl = hasPayment ? `${window.location.origin}/kuitansi/${transactionId}` : ''

  const receiptData: ReceiptData | null = hasPayment ? {
    id: transactionId,
    receipt_no: receiptNo,
    applicant_name: applicant?.full_name || 'Calon Santri',
    registration_path: (applicant?.registration_path || 'Reguler').toUpperCase(),
    amount: transaction.amount,
    payment_method: (transaction.method || 'TIDAK DIKETAHUI').toUpperCase(),
    payment_date: transaction.updated_at || transaction.created_at,
    status: transaction.status,
    is_paid: ['paid', 'settlement', 'success'].includes(transaction.status),
  } : null

  const handleCopyLink = async () => {
    if (!shareUrl) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
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
    if (!shareUrl) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kuitansi Pembayaran Formulir PPDB PTDARRAHMAN',
          text: `Kuitansi Pembayaran Formulir PPDB Pesantren Tahfidz Qur'an dan Digital Arrahman atas nama ${applicant?.full_name || 'Calon Santri'}:\n${shareUrl}`,
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
    if (!shareUrl || !receiptData) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
    // Status ikut diambil dari transaksi, bukan ditulis "LUNAS" secara manual:
    // kuitansi ini bisa dibagikan ke orang tua/wali, jadi tidak boleh
    // mengklaim lunas padahal statusnya belum terverifikasi.
    const text = encodeURIComponent(
      `*KUITANSI PEMBAYARAN FORMULIR PPDB PTDARRAHMAN*\n\nNama: ${applicant?.full_name || 'Calon Santri'}\nNo. Kuitansi: ${receiptNo}\nStatus: *${receiptData.is_paid ? 'LUNAS' : receiptData.status.toUpperCase()}*\n\nBuka kuitansi digital sah di tautan berikut:\n${shareUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  return (
    <div className="mx-auto max-w-4xl w-full space-y-6">
      <ApplicantPageHeader
        title="Kuitansi Pembayaran Formulir"
        description="Bukti pembayaran sah pendaftaran calon santri baru Pesantren Tahfidz Qur'an dan Digital Arrahman."
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
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-800">Kuitansi belum terbit</p>
            <p className="text-xs text-slate-500">
              Belum ada pembayaran yang tercatat atas nama Anda, jadi kuitansi belum bisa
              ditampilkan. Kuitansi terbit otomatis setelah pembayaran Anda diterima.
            </p>
          </div>
        ) : null}
    </div>
  )
}
