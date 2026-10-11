import { CheckCircle, QrCode, ShieldCheck } from 'lucide-react'
import { Card, CardContent, Badge } from "@/components/ui"

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export interface ReceiptData {
  id?: string
  receipt_no: string
  applicant_name: string
  registration_path: string
  amount: number
  payment_method: string
  payment_date?: string | null
  status: string
  is_paid: boolean
}

interface OfficialReceiptCardProps {
  receipt: ReceiptData
  showWatermark?: boolean
}

export default function OfficialReceiptCard({ receipt, showWatermark = true }: OfficialReceiptCardProps) {
  const amountStr = formatRp(receipt.amount)
  const payDateStr = receipt.payment_date
    ? new Date(receipt.payment_date).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'

  return (
    <Card className="border-emerald-200/80 bg-white shadow-xl overflow-hidden relative max-w-2xl mx-auto rounded-3xl w-full">
      {/* Background Watermark */}
      {showWatermark && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none">
          <ShieldCheck className="w-80 h-80 sm:w-96 sm:h-96 text-emerald-950" />
        </div>
      )}

      {/* Header Kuitansi */}
      <div className="bg-emerald-950 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-4 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 relative z-10 border-b border-emerald-800/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-emerald-200 uppercase leading-snug">
              Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman
            </span>
          </div>
          <h2 className="font-heading text-lg sm:text-2xl font-bold mt-1 text-white break-words">
            Kuitansi Pembayaran Formulir
          </h2>
          <p className="text-xs text-emerald-100/90 font-mono mt-0.5 truncate max-w-full">
            No: {receipt.receipt_no}
          </p>
        </div>

        <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 border-t border-emerald-700/50 sm:border-t-0 pt-2 sm:pt-0">
          <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400 font-bold px-3 py-1 text-xs gap-1.5 shadow-sm rounded-full">
            <CheckCircle className="h-3.5 w-3.5" /> LUNAS
          </Badge>
          <span className="text-[11px] text-emerald-200 font-mono font-medium">
            PPDB {new Date().getFullYear()}
          </span>
        </div>
      </div>

      <CardContent className="p-4 sm:p-7 space-y-5 sm:space-y-6 relative z-10">
        {/* Detail Pendaftar & Transaksi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 text-sm bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-150">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">Nama Calon Santri</p>
            <p className="font-bold text-slate-900 mt-0.5 text-base break-words">{receipt.applicant_name}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">Jalur Pendaftaran</p>
            <p className="font-semibold text-emerald-700 mt-0.5 capitalize">{receipt.registration_path}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">Tanggal Pembayaran</p>
            <p className="font-medium text-slate-800 mt-0.5 text-xs sm:text-sm">{payDateStr}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">Metode Pembayaran</p>
            <p className="font-medium text-slate-800 mt-0.5 text-xs sm:text-sm">{receipt.payment_method}</p>
          </div>
          <div className="sm:col-span-2 pt-3 border-t border-slate-200 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs">Rincian Pembayaran</p>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5">
                Biaya Formulir Pendaftaran PPDB
              </p>
            </div>
            <div className="text-left xs:text-right">
              <p className="text-muted-foreground text-xs">Total Pembayaran</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-heading">{amountStr}</p>
            </div>
          </div>
        </div>

        {/* QR Code Verifikasi Kuitansi */}
        <div className="border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 rounded-2xl">
          <div className="flex items-start sm:items-center gap-3.5 w-full min-w-0">
            <div className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-2xl shadow-sm shrink-0">
              <QrCode className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verifikasi Resmi
                </span>
                <span className="text-xs font-mono text-slate-600 font-semibold truncate max-w-full">{receipt.receipt_no}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Kuitansi sah &amp; terverifikasi otomatis oleh Sistem PPDB Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 w-full sm:w-auto flex justify-end">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/10 text-emerald-800 rounded-full font-bold text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Status Sah</span>
            </div>
          </div>
        </div>

        {/* Footer Catatan Kuitansi */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-[11px] text-slate-400 text-center sm:text-left">
          <p>© {new Date().getFullYear()} PPDB Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman. Seluruh hak cipta dilindungi.</p>
          <p className="font-mono text-[10px] sm:text-[11px]">Dokumen Digital Sah Tanpa Tanda Tangan Basah</p>
        </div>
      </CardContent>
    </Card>
  )
}
