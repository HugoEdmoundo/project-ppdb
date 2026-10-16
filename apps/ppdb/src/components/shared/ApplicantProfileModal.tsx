import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import {
  Printer,
  Download,
  ChevronDown,
  Clock,
  FileText,
  Image as ImageIcon,
  FileCheck2,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import ApplicantFormDocument from './ApplicantFormDocument'
import { downloadApplicantFormDoc } from '@/utils/exportApplicantForm'

interface ApplicantProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicant: any
  title?: string
  showPasswordHint?: boolean
}

export default function ApplicantProfileModal({
  open,
  onOpenChange,
  applicant,
  title = 'Formulir Pendaftaran Calon Santri',
}: ApplicantProfileModalProps) {
  const { toast } = useToast()
  const documentContainerRef = useRef<HTMLDivElement | null>(null)

  const [activePage, setActivePage] = useState<1 | 2 | 'both'>('both')
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)

  // Ambil detail pendaftar lengkap jika ada id
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['applicant-detail-modal', applicant?.id],
    queryFn: async () => {
      if (!applicant?.id) return null
      return await apiFetch<any>(`/ppdb/applicants/${applicant.id}`)
    },
    enabled: open && !!applicant?.id,
  })

  if (!applicant) return null

  // Gabungkan data awal dengan detail terbaru dari server
  const resolvedApplicant = detailData || applicant
  const fullName = resolvedApplicant.full_name || 'Calon Santri'
  const regNo =
    resolvedApplicant.nisn ||
    resolvedApplicant.nik ||
    (resolvedApplicant.id ? resolvedApplicant.id.slice(0, 8).toUpperCase() : 'REG')

  const handleDownload = async (format: 'pdf' | 'image') => {
    if (!documentContainerRef.current) {
      toast('error', 'Dokumen formulir belum siap diunduh. Mohon tunggu sebentar.')
      return
    }
    try {
      setIsDownloading(format)
      await downloadApplicantFormDoc({
        containerElement: documentContainerRef.current,
        format,
        applicantName: fullName,
        registrationNo: regNo,
        pageMode: activePage,
      })
      toast(
        'success',
        `Formulir pendaftaran berhasil diunduh sebagai ${
          format === 'pdf' ? 'Dokumen PDF Resmi (A4)' : 'Gambar PNG (HD)'
        }`
      )
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunduh formulir pendaftaran')
    } finally {
      setIsDownloading(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] overflow-y-auto p-3 sm:p-6 bg-slate-100">
        <DialogHeader className="print:hidden pb-3 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Judul & Info Santri (Siap Nama Panjang & Responsif) */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm sm:text-base text-slate-900 font-bold leading-tight">
                  {title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-emerald-800 break-words hyphens-auto max-w-full">
                    {fullName}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-slate-600">Reg: {regNo}</span>
                  {resolvedApplicant.wave_name && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">{resolvedApplicant.wave_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Page Selector (2 Halaman, Hal 1, Hal 2) */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActivePage('both')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activePage === 'both'
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2 Halaman
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(1)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activePage === 1
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hal 1
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(2)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activePage === 2
                      ? 'bg-slate-900 text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hal 2
                </button>
              </div>

              {/* Tombol Cetak / Print PDF */}
              <Button
                type="button"
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200 cursor-pointer shadow-2xs font-medium"
                title="Cetak formulir via printer atau simpan ke PDF browser"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden xs:inline">Cetak / Print PDF</span>
              </Button>

              {/* Dropdown Download Formulir (PDF / Gambar PNG) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!isDownloading}
                    className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700 shadow-2xs font-semibold cursor-pointer"
                  >
                    {isDownloading ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin text-white shrink-0" />
                        <span>Menyiapkan {isDownloading === 'pdf' ? 'PDF' : 'Gambar'}...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 text-white shrink-0" />
                        <span>Download Formulir</span>
                        <ChevronDown className="h-3 w-3 text-emerald-200 shrink-0" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-slate-200 bg-white">
                  <DropdownMenuItem
                    onClick={() => handleDownload('pdf')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Dokumen PDF (A4)</span>
                      <span className="text-[10px] text-slate-500">
                        {activePage === 'both' ? 'Format 2 Halaman Lengkap' : `Halaman ${activePage} A4`}
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleDownload('image')}
                    disabled={!!isDownloading}
                    className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer font-medium hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-900">Gambar PNG (HD)</span>
                      <span className="text-[10px] text-slate-500">
                        {activePage === 'both' ? '2 Berkas Gambar PNG' : `Gambar Halaman ${activePage}`}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        {/* Loading detail indicator if refetching */}
        {detailLoading && !detailData && (
          <div className="py-2 text-center text-xs text-slate-500 animate-pulse">
            Memuat data lengkap pendaftar...
          </div>
        )}

        {/* Document Render Container with Ref */}
        <div
          ref={documentContainerRef}
          className="flex justify-start sm:justify-center overflow-x-auto touch-pan-x py-2 pb-6"
        >
          <ApplicantFormDocument applicant={resolvedApplicant} page={activePage} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
