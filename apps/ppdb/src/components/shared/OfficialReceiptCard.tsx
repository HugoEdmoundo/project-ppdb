import { CheckCircle, QrCode, ShieldCheck } from 'lucide-react'
import { Card, CardContent, Badge } from "@/components/ui"
import ReceiptQrCode from './ReceiptQrCode'

const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

export interface ReceiptData {
  id?: string
  receipt_no: string
  order_id?: string
  txn_id?: string
  payment_type?: string
  payment_type_label?: string
  installment_number?: number | null
  applicant_name: string
  registration_number?: string
  registration_path: string
  wave_name?: string
  amount: number
  payment_method: string
  payment_date?: string | null
  status: string
  is_paid: boolean
  financial_snapshot?: {
    total_obligation?: number | null
    total_paid_before?: number | null
    remaining_before?: number | null
    amount_paid?: number | null
    total_paid_after?: number | null
    remaining_after?: number | null
    is_lunas?: boolean
  }
}

interface OfficialReceiptCardProps {
  receipt: ReceiptData
  showWatermark?: boolean
}

export default function OfficialReceiptCard({ receipt, showWatermark = true }: OfficialReceiptCardProps) {
  const amountStr = formatRp(receipt.amount)
  const verifyUrl = receipt.id ? `${window.location.origin}/receipt/${receipt.id}` : null
  const payDateStr = receipt.payment_date
    ? new Date(receipt.payment_date).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    : '-'

  const docTitle = receipt.payment_type_label || (
    receipt.payment_type === 'dp'
      ? 'Kuitansi Uang Muka (DP) Tahap 2'
      : receipt.payment_type === 'installment'
      ? `Kuitansi Cicilan Tahap 2 (Cicilan ke-${receipt.installment_number || 1})`
      : 'Kuitansi Pembayaran Formulir'
  )

  const isLunas = receipt.financial_snapshot?.is_lunas ?? (receipt.financial_snapshot?.remaining_after === 0)

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
              Pesantren Tahfidz Qur&apos;an dan Digital Arrahman
            </span>
          </div>
          <h2 className="font-heading text-lg sm:text-2xl font-bold mt-1 text-white break-words">
            {docTitle}
          </h2>
          <p className="text-xs text-emerald-100/90 font-mono mt-0.5 truncate max-w-full">
            No: {receipt.receipt_no}
          </p>
        </div>

        <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 border-t border-emerald-700/50 sm:border-t-0 pt-2 sm:pt-0">
          <Badge className={`${isLunas ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-400' : 'bg-amber-300 text-amber-950 hover:bg-amber-300'} font-bold px-3 py-1 text-xs gap-1.5 shadow-sm rounded-full`}>
            <CheckCircle className="h-3.5 w-3.5" /> {isLunas ? 'LUNAS' : 'TERVERIFIKASI'}
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
            <p className="text-muted-foreground text-xs font-medium">No. Registrasi / Jalur</p>
            <p className="font-semibold text-emerald-700 mt-0.5">
              {receipt.registration_number ? `${receipt.registration_number} · ` : ''}{receipt.registration_path}
            </p>
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
              <p className="text-muted-foreground text-xs">Jenis Pembayaran</p>
              <p className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5">
                {docTitle}
              </p>
            </div>
            <div className="text-left xs:text-right">
              <p className="text-muted-foreground text-xs">Total Pembayaran Transaksi Ini</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 font-heading">{amountStr}</p>
            </div>
          </div>
        </div>

        {/* Snapshot Finansial Resmi (jika ada snapshot DP/Tahap 2) */}
        {receipt.financial_snapshot && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Snapshot Saldo Kewajiban PPDB
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isLunas ? 'Status: LUNAS ✓' : 'Status: BELUM LUNAS'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border min-w-0">
                <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Total Tagihan LoA</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm block truncate">
                  {formatRp(receipt.financial_snapshot.total_obligation || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border min-w-0">
                <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Terbayar Sblm Transaksi</span>
                <span className="font-semibold text-slate-700 text-xs sm:text-sm block truncate">
                  {formatRp(receipt.financial_snapshot.total_paid_before || 0)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border min-w-0">
                <span className="text-muted-foreground block text-[10px] sm:text-[11px] truncate">Sisa Sblm Transaksi</span>
                <span className="font-semibold text-amber-800 text-xs sm:text-sm block truncate">
                  {formatRp(receipt.financial_snapshot.remaining_before || 0)}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 min-w-0">
                <span className="text-emerald-800 block text-[10px] sm:text-[11px] font-medium truncate">Dibayar Transaksi Ini</span>
                <span className="font-bold text-emerald-700 text-xs sm:text-sm block truncate">{amountStr}</span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 min-w-0">
                <span className="text-emerald-800 block text-[10px] sm:text-[11px] font-medium truncate">Total Akumulasi Terbayar</span>
                <span className="font-bold text-emerald-800 text-xs sm:text-sm block truncate">
                  {formatRp(receipt.financial_snapshot.total_paid_after || 0)}
                </span>
              </div>
              <div className={`p-2.5 rounded-lg border min-w-0 ${isLunas ? 'bg-emerald-100/50 border-emerald-300' : 'bg-red-50/70 border-red-200'}`}>
                <span className={`${isLunas ? 'text-emerald-800' : 'text-red-700'} block text-[10px] sm:text-[11px] font-medium truncate`}>Sisa Tagihan Setelahnya</span>
                <span className={`font-bold text-xs sm:text-sm block truncate ${isLunas ? 'text-emerald-900' : 'text-red-700'}`}>
                  {formatRp(receipt.financial_snapshot.remaining_after || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Verifikasi Kuitansi — QR asli berisi URL kuitansi publik */}
        <div className="border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full min-w-0">
            {verifyUrl ? (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-xl"
                title="Pindai dengan kamera ponsel atau klik untuk membuka kuitansi publik"
                aria-label="Buka kuitansi publik untuk verifikasi"
              >
                <ReceiptQrCode value={verifyUrl} />
              </a>
            ) : (
              <div className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-2xl shadow-sm shrink-0">
                <QrCode className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verifikasi Resmi
                </span>
                <span className="text-xs font-mono text-slate-600 font-semibold truncate max-w-full">{receipt.receipt_no}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pindai QR ini dengan kamera ponsel untuk membuka kuitansi publik dan memverifikasi keasliannya.
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right shrink-0 w-full sm:w-auto flex justify-center sm:justify-end">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/10 text-emerald-800 rounded-full font-bold text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Status Sah</span>
            </div>
          </div>
        </div>

        {/* Footer Catatan Kuitansi */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-[11px] text-slate-400 text-center sm:text-left">
          <p>© {new Date().getFullYear()} PPDB Pesantren Tahfidz Qur&apos;an dan Digital Arrahman. Seluruh hak cipta dilindungi.</p>
          <p className="font-mono text-[10px] sm:text-[11px]">Dokumen Digital Sah Tanpa Tanda Tangan Basah</p>
        </div>
      </CardContent>
    </Card>
  )
}
