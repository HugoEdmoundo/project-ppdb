import { useState } from 'react'
import {
  CheckCircle,
  Share2,
  Copy,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Card, CardContent, Button, Badge } from "@/components/ui"
import { useToast } from '@/components/Toast'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

interface PaymentStepProps {
  transaction: any
  applicant?: any
}

export default function PaymentStep({ transaction, applicant }: PaymentStepProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const receiptNo = `KUI-PPDB-${(transaction?.id || applicant?.id || '00000000').slice(0, 8).toUpperCase()}`
  const applicantName = applicant?.full_name || 'Calon Santri'
  const pathName = (applicant?.registration_path || 'Reguler').toUpperCase()
  const amountStr = formatRp(transaction?.amount || 0)
  const payDateStr = transaction?.updated_at
    ? new Date(transaction.updated_at).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'
  const payMethod = (transaction?.method || 'QRIS').toUpperCase()

  const shareText = `*KUITANSI PEMBAYARAN FORMULIR PPDB AR-RAHMAN*\n\nNo. Kuitansi: ${receiptNo}\nNama: ${applicantName}\nJalur: ${pathName}\nNominal: ${amountStr}\nMetode: ${payMethod}\nTanggal: ${payDateStr}\nStatus: *LUNAS (TERVERIFIKASI)*\n\nBukti sah pendaftaran PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.`

  const handleCopy = async () => {
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kuitansi Pembayaran Formulir PPDB Ar-Rahman',
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
                Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman
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
            <Badge className="bg-emerald-400 text-emerald-950 font-bold px-3 py-1 text-xs gap-1 shadow-sm">
              <CheckCircle className="h-3.5 w-3.5" /> LUNAS
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

          {/* QR Code Verifikasi Kuitansi */}
          <div className="pt-2 border-t border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <QrCode className="h-9 w-9" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    QR Verifikasi
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-semibold">{receiptNo}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Kuitansi sah &amp; terverifikasi otomatis oleh Panitia PPDB Ar-Rahman
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
