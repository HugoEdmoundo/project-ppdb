import { useState } from 'react'
import {
  CheckCircle,
  Clock,
  Share2,
  Copy,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Card, CardContent, Button, Badge } from "@/components/ui"
import ReceiptQrCode from '@/components/shared/ReceiptQrCode'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface PaymentStepProps {
  transaction: any
  applicant?: any
}

export default function PaymentStep({ transaction, applicant }: PaymentStepProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Badge "LUNAS" dan teks "Bukti sah ... LUNAS (TERVERIFIKASI)" sebelumnya
  // ditulis tanpa syarat: kartu tetap dirender meski tidak ada transaksi sama
  // sekali, sehingga muncul kuitansi resmi padahal tidak ada pembayaran.
  // Nominal memang jatuh ke 0, tapi badge dan teks "TERVERIFIKASI" tetap dipatok.
  const hasPayment = !!transaction
  const isPaid = hasPayment && ['paid', 'settlement', 'success'].includes(transaction!.status)

  // Tanda hubung UUID dibuang dulu sebelum dipotong, supaya dapat 12 karakter
  // heksadesimal yang bersih (id[:12] saja menghasilkan "ABCDEF12-345",
  // 11 hex + tanda hubung) dan nomornya konsisten dengan backend.
  const receiptNo = hasPayment
    ? `KUI-PPDB-${transaction!.id.replace(/-/g, '').slice(0, 12).toUpperCase()}`
    : '-'
  const applicantName = applicant?.full_name || 'Calon Santri'
  const pathName = (applicant?.registration_path || 'Reguler').toUpperCase()
  // QR verifikasi berisi URL kuitansi publik. Hanya dibuat kalau transaksi
  // benar-benar ada, supaya tidak ada QR yang menunjuk ke kuitansi kosong.
  const verifyUrl = hasPayment ? `${window.location.origin}/kuitansi/${transaction!.id}` : null
  const amountStr = formatRp(transaction?.amount || 0)
  const payDateStr = transaction?.updated_at
    ? new Date(transaction.updated_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'
  // Metode yang tidak tercatat ditulis apa adanya, bukan ditebak QRIS.
  const payMethod = (transaction?.method || 'TIDAK DIKETAHUI').toUpperCase()
  const statusLabel = isPaid ? 'LUNAS' : (transaction?.status || 'BELUM BAYAR').toUpperCase()

  const shareText = `*KUITANSI PEMBAYARAN FORMULIR PPDB PTDARRAHMAN*\n\nNo. Kuitansi: ${receiptNo}\nNama: ${applicantName}\nJalur: ${pathName}\nNominal: ${amountStr}\nMetode: ${payMethod}\nTanggal: ${payDateStr}\nStatus: *${statusLabel}*\n\nBukti sah pendaftaran PPDB Pesantren Tahfidz Qur'an dan Digital Arrahman.`

  const handleCopy = async () => {
    if (!hasPayment) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast('success', 'Kuitansi disalin ke clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('error', 'Gagal menyalin kuitansi')
    }
  }

  const handleShare = async () => {
    if (!hasPayment) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kuitansi Pembayaran Formulir PPDB PTDARRAHMAN',
          text: shareText,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy()
    }
  }

  const handleWhatsApp = () => {
    if (!hasPayment) {
      toast('error', 'Kuitansi belum tersedia karena belum ada pembayaran tercatat')
      return
    }
    const encoded = encodeURIComponent(shareText)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Kartu Kuitansi Resmi */}
      <Card className="border-emerald-200 bg-white shadow-sm overflow-hidden print:shadow-none print:border-none">
        {/* Header Kuitansi */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <span className="text-[11px] font-bold tracking-wider text-emerald-200 uppercase">
                Pesantren Tahfidz Qur&apos;an dan Digital Arrahman
              </span>
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold mt-1 text-white">
              Kuitansi Pembayaran Formulir
            </h3>
            <p className="text-xs text-emerald-100 font-mono mt-0.5">
              No: {receiptNo}
            </p>
          </div>

          <div className="shrink-0 flex items-center sm:flex-col sm:items-end gap-2">
            <Badge
              className={cn(
                'font-bold px-3 py-1 text-xs gap-1 shadow-sm',
                isPaid
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-amber-300 text-amber-950'
              )}
            >
              {isPaid ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {statusLabel}
            </Badge>
            <span className="text-[11px] text-emerald-200 font-mono">
              PPDB {new Date().getFullYear()}
            </span>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Detail Pendaftar & Transaksi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-muted-foreground text-xs">Nama Calon Santri</p>
              <p className="font-bold text-slate-900 mt-0.5">{applicantName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
              <p className="font-semibold text-emerald-700 mt-0.5">{pathName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tanggal Pembayaran</p>
              <p className="font-medium text-slate-800 mt-0.5">{payDateStr}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Metode Pembayaran</p>
              <p className="font-medium text-slate-800 mt-0.5">{payMethod}</p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Rincian Pembayaran</p>
                <p className="font-medium text-slate-800 text-xs mt-0.5">
                  Biaya Formulir Pendaftaran PPDB
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Total Pembayaran</p>
                <p className="text-lg font-bold text-emerald-700">{amountStr}</p>
              </div>
            </div>
          </div>

          {/* QR Code Verifikasi Kuitansi — QR asli berisi URL kuitansi publik */}
          <div className="pt-2 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div className="flex flex-col sm:flex-row items-center gap-3.5 min-w-0">
              {verifyUrl ? (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-xl"
                  title="Pindai dengan kamera ponsel atau klik untuk membuka kuitansi publik"
                  aria-label="Buka kuitansi publik untuk verifikasi"
                >
                  <ReceiptQrCode value={verifyUrl} size={96} />
                </a>
              ) : (
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs shrink-0">
                  <QrCode className="h-9 w-9" />
                </div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    QR Verifikasi
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-semibold">{receiptNo}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Pindai QR dengan kamera ponsel untuk membuka kuitansi publik dan memverifikasi keasliannya.
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-emerald-700 font-semibold hidden sm:block">
              Status Valid ✓
            </div>
          </div>

          {/* Action Buttons (Ringkas & Efisien) */}
          <div className="pt-2 flex flex-wrap items-center gap-2 print:hidden">
            <Button
              type="button"
              size="sm"
              onClick={handleShare}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 h-8 text-xs font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" />
              Bagikan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              className="gap-1.5 h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="gap-1.5 h-8 text-xs font-semibold"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Salin'}
            </Button>
                      </div>
        </CardContent>
      </Card>
    </div>
  )
}
