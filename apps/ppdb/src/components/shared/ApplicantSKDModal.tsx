import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'
import { Printer, Award, Building2, QrCode, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { downloadSkdPdf, downloadSkdImage } from '@/utils/exportSkd'

interface ApplicantSKDModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
  isApplicantPortal?: boolean
}

function strLimit(str: string, limit: number) {
  if (!str) return ''
  return str.substring(0, limit)
}

export default function ApplicantSKDModal({
  open,
  onOpenChange,
  applicantId,
  isApplicantPortal = false,
}: ApplicantSKDModalProps) {
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-skd', isApplicantPortal ? 'me' : applicantId],
    queryFn: async () => {
      const url = isApplicantPortal
        ? '/ppdb/applicants/me/skd'
        : `/ppdb/applicants/${applicantId}/skd`
      return await apiFetch<any>(url)
    },
    enabled: open && (isApplicantPortal || !!applicantId),
  })

  const applicant = data?.applicant
  const letterNumber = data?.letter_number || `SKD/PPDB/${new Date().getFullYear()}/${strLimit(applicantId, 8).toUpperCase()}`

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = async () => {
    const el = printRef.current
    if (!el || !applicant) {
      toast('error', 'Dokumen SKD belum siap diunduh.')
      return
    }
    try {
      setIsDownloading('pdf')
      await downloadSkdPdf(el, applicant.full_name, applicant.id)
      toast('success', 'Dokumen SKD PDF (A4 Landscape) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh SKD PDF')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDownloadImage = async () => {
    const el = printRef.current
    if (!el || !applicant) {
      toast('error', 'Dokumen SKD belum siap diunduh.')
      return
    }
    try {
      setIsDownloading('image')
      await downloadSkdImage(el, applicant.full_name, applicant.id)
      toast('success', 'Gambar SKD (PNG) berhasil diunduh.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh gambar SKD')
    } finally {
      setIsDownloading(null)
    }
  }

  const renderCertificateContent = () => {
    if (!applicant) return null
    return (
      <div
        className="a4-document-page-landscape relative bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900 text-white shadow-2xl border-4 border-slate-950 overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-none print:m-0"
        style={{
          width: '297mm',
          minWidth: '297mm',
          maxWidth: '297mm',
          height: '210mm',
          minHeight: '210mm',
          maxHeight: '210mm',
          boxSizing: 'border-box',
          padding: '8mm 12mm',
        }}
      >
        {/* Subtle Islamic Geometric Pattern Watermark in Background */}
        <div
          className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)]"
          style={{ backgroundSize: '24px 24px' }}
        />

        {/* Inner Golden Double Border Frame */}
        <div className="absolute inset-3 border-2 border-amber-500/70 rounded-md pointer-events-none" />
        <div className="absolute inset-5 border border-amber-400/40 rounded-sm pointer-events-none" />

        {/* Four Corner Decorative Flourishes */}
        <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

        {/* Radial Center Glow */}
        <div className="absolute inset-0 bg-radial from-amber-400/5 via-transparent to-black/40 pointer-events-none" />

        {/* Certificate Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-between text-center px-6 py-2">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-amber-400" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-amber-200/90 font-serif">
                YAYASAN & PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL ARRAHMAN
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest uppercase text-amber-300">
              SURAT KETERANGAN DITERIMA
            </h1>
            <p className="text-[11px] font-serif italic tracking-widest uppercase text-amber-200/70">
              Certificate of Acceptance
            </p>

            <div className="flex items-center justify-center gap-3 pt-0.5">
              <div className="h-[1px] w-14 bg-amber-400/60" />
              <span className="text-[10px] font-mono tracking-wider text-amber-300">
                {letterNumber}
              </span>
              <div className="h-[1px] w-14 bg-amber-400/60" />
            </div>
          </div>

          {/* Body / Awarded To */}
          <div className="space-y-1.5 my-auto py-2">
            <p className="text-xs italic text-slate-300">
              Diberikan kepada / This is proudly presented to:
            </p>

            <h2 className="text-3xl font-serif font-bold tracking-wide uppercase text-white">
              {applicant.full_name}
            </h2>

            <div className="flex items-center justify-center gap-4 text-xs font-medium">
              <span className="text-amber-200/90">
                NISN: <strong>{applicant.nisn || applicant.nik || '-'}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-200/90">
                No. Pendaftaran: <strong>{strLimit(applicant.id, 8).toUpperCase()}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-200/90">
                Jalur: <strong>{(applicant.path_name || applicant.registration_path || 'Reguler').toUpperCase()}</strong>
              </span>
            </div>

            <div className="max-w-2xl mx-auto text-xs leading-relaxed text-center pt-2 text-slate-200/90">
              Berdasarkan Keputusan Panitia Seleksi PPDB, yang bersangkutan telah memenuhi seluruh kriteria
              kelayakan dan secara resmi dinyatakan <strong className="text-amber-300">LULUS</strong> serta{' '}
              <strong className="text-amber-300">DITERIMA</strong> sebagai Santri Baru pada{' '}
              <strong>Pesantren Tahfidz Qur&apos;an dan Digital Arrahman</strong>.
            </div>
          </div>

          {/* Footer: QR Code, Gold Seal Badge, Signature */}
          <div className="grid grid-cols-3 items-end pt-2 border-t border-amber-500/30">
            {/* Left: QR Code Verification */}
            <div className="text-left flex items-center gap-2.5">
              <div className="p-1 rounded bg-white/10 border border-amber-400/40 text-amber-300">
                <QrCode className="h-8 w-8" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold block text-white">
                  VALIDASI DIGITAL
                </span>
                <span className="text-[8px] block text-slate-400">
                  Dokumen sah diterbitkan sistem PPDB
                </span>
              </div>
            </div>

            {/* Center: Gold Seal Emblem */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-slate-950 flex flex-col items-center justify-center shadow-lg">
                <Award className="h-4 w-4" />
                <span className="text-[6px] font-extrabold uppercase tracking-tighter">OFFICIAL</span>
              </div>
              <span className="text-[8px] font-semibold mt-0.5 tracking-wider text-amber-300">
                PPDB PTDARRAHMAN {new Date().getFullYear()}
              </span>
            </div>

            {/* Right: Signature */}
            <div className="text-right space-y-0.5">
              <p className="text-[9px] text-slate-300">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="h-8 flex items-center justify-end pr-2">
                <span className="font-serif italic text-emerald-300 text-xs font-semibold opacity-90">
                  Dr. H. Abdurrahman, M.A.
                </span>
              </div>
              <p className="text-xs font-bold underline text-white">
                Ust. Dr. H. Abdurrahman, M.A.
              </p>
              <p className="text-[9px] text-amber-200/80">
                Pengasuh / Direktur Pesantren
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-slate-900 border-slate-800">
        <style>{`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #022c22 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        <DialogHeader className="print:hidden pb-2 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2 text-base text-amber-400">
              <Award className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Surat Keterangan Diterima (SKD) - Format Sertifikat</span>
            </DialogTitle>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!isDownloading || isLoading || !applicant}
                    className="gap-1.5 h-9 sm:h-8 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 flex-1 sm:flex-none font-medium cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengunduh...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Unduh SKD</span>
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
                  <DropdownMenuItem
                    onClick={handleDownloadPdf}
                    className="cursor-pointer gap-2 hover:bg-slate-800 focus:bg-slate-800 text-xs text-slate-200"
                  >
                    <FileText className="h-4 w-4 text-red-400" />
                    <div>
                      <div className="font-semibold">Unduh Dokumen PDF</div>
                      <div className="text-[10px] text-slate-400">Ukuran A4 Landscape Pas</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDownloadImage}
                    className="cursor-pointer gap-2 hover:bg-slate-800 focus:bg-slate-800 text-xs text-slate-200"
                  >
                    <ImageIcon className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Unduh Gambar (PNG)</div>
                      <div className="text-[10px] text-slate-400">Resolusi Tinggi 2x</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={handlePrint}
                size="sm"
                variant="outline"
                className="gap-1.5 h-9 sm:h-8 text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 flex-1 sm:flex-none font-medium cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak / Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">
            Menyiapkan dokumen SKD resmi...
          </div>
        ) : !applicant ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Data SKD tidak ditemukan.
          </div>
        ) : (
          <div className="flex justify-start sm:justify-center py-2 overflow-x-auto touch-pan-x w-full">
            <style>{`
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 0;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #022c22 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .a4-document-page-landscape {
                  width: 297mm !important;
                  height: 210mm !important;
                  min-height: 210mm !important;
                  max-height: 210mm !important;
                  padding: 8mm 12mm !important;
                  margin: 0 auto !important;
                  box-shadow: none !important;
                  border: none !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                  box-sizing: border-box !important;
                  overflow: hidden !important;
                }
              }
            `}</style>
            <div ref={printRef}>
              {renderCertificateContent()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
