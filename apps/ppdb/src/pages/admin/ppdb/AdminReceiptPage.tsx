import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import OfficialReceiptCard, { type ReceiptData } from '@/components/shared/OfficialReceiptCard'
import {
  Button,
  Skeleton,
  Card,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'
import {
  ArrowLeft,
  Share2,
  MessageCircle,
  Copy,
  Check,
  FileText,
  Download,
  Printer,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { downloadReceiptPdf, downloadReceiptImage } from '@/utils/exportReceipt'

export default function AdminReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)

  const {
    data: receipt,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ReceiptData>({
    queryKey: ['admin-receipt', id],
    queryFn: async () => {
      if (!id) throw new Error('ID Transaksi tidak valid')
      try {
        return await apiFetch<ReceiptData>(`/payment/receipt/${id}`)
      } catch {
        return await apiFetch<ReceiptData>(`/payment/public-receipt/${id}`)
      }
    },
    enabled: !!id,
  })

  const shareUrl = id ? `${window.location.origin}/kuitansi/${id}` : ''

  const handleCopyLink = async () => {
    if (!shareUrl) return
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
    if (!shareUrl || !receipt) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Kuitansi Pembayaran PPDB - ${receipt.receipt_no}`,
          text: `Kuitansi Pembayaran PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman atas nama ${receipt.applicant_name} (${receipt.receipt_no}):\n${shareUrl}`,
          url: shareUrl,
        })
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsApp = () => {
    if (!shareUrl || !receipt) return
    const text = encodeURIComponent(
      `*KUITANSI RESMI PEMBAYARAN PPDB AR-RAHMAN*\n\n` +
      `No. Kuitansi: *${receipt.receipt_no}*\n` +
      `Nama: ${receipt.applicant_name}\n` +
      `Nominal: Rp ${Number(receipt.amount || 0).toLocaleString('id-ID')}\n` +
      `Metode: ${(receipt.payment_method || 'QRIS').toUpperCase()}\n` +
      `Status: *LUNAS*\n\n` +
      `Buka bukti kuitansi digital sah di tautan berikut:\n${shareUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleDownloadPdf = async () => {
    if (!cardRef.current || !receipt) return
    try {
      setIsDownloading('pdf')
      await downloadReceiptPdf(cardRef.current, receipt.applicant_name, receipt.receipt_no)
      toast('success', 'Kuitansi resmi PDF (A4) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh kuitansi PDF')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadImage = async () => {
    if (!cardRef.current || !receipt) return
    try {
      setIsDownloading('image')
      await downloadReceiptImage(cardRef.current, receipt.applicant_name, receipt.receipt_no)
      toast('success', 'Gambar kuitansi (PNG) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh gambar kuitansi')
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Breadcrumb / Back button & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 text-muted-foreground hover:text-foreground w-fit -ml-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        {receipt && (
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!isDownloading}
                  className="h-9 px-3 text-xs rounded-xl gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer font-medium"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh Kuitansi</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleDownloadPdf} className="cursor-pointer gap-2 text-xs">
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span>Unduh Dokumen PDF (A4)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadImage} className="cursor-pointer gap-2 text-xs">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  <span>Unduh Gambar (PNG)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()} className="cursor-pointer gap-2 text-xs">
                  <Printer className="h-4 w-4 text-slate-600" />
                  <span>Cetak Langsung (Print)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="h-9 px-3 text-xs rounded-xl gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              Bagikan
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Salin Link'}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="bg-card rounded-3xl p-6 sm:p-8 border shadow-sm space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <Card className="rounded-2xl border-amber-200 p-8 text-center max-w-lg mx-auto bg-amber-50/40">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-amber-950 font-heading">Kuitansi Belum Terbit</h3>
          <p className="text-sm text-amber-800 mt-1 max-w-md mx-auto leading-relaxed">
            {(error as any)?.message ||
              'Kuitansi resmi hanya diterbitkan untuk transaksi yang sudah terverifikasi lunas (sukses).'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs">
              Kembali
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} /> Coba Lagi
            </Button>
          </div>
        </Card>
      )}

      {receipt && (
        <div className="w-full max-w-2xl mx-auto">
          <div ref={cardRef}>
            <OfficialReceiptCard receipt={receipt} />
          </div>
        </div>
      )}
    </div>
  )
}
