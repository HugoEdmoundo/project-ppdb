import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import {
  Printer,
  Award,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PenTool,
  Download,
  Share2,
  FileText,
  Image as ImageIcon,
  Clock,
  ChevronDown,
} from 'lucide-react'
import LoaOfficialDocument, { type LoaData } from './LoaOfficialDocument'
import ApplicantSignLoAModal from './ApplicantSignLoAModal'
import { downloadLoaDoc, shareLoaDoc } from '@/utils/exportLoa'
import { useToast } from '@/components/Toast'

interface ApplicantLoAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
  isApplicantPortal?: boolean
}

export default function ApplicantLoAModal({
  open,
  onOpenChange,
  applicantId,
  isApplicantPortal = false,
}: ApplicantLoAModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const documentContainerRef = useRef<HTMLDivElement | null>(null)
  const hiddenExportRef = useRef<HTMLDivElement | null>(null)

  const [activePage, setActivePage] = useState<1 | 2 | 'both'>('both')
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'image' | null>(null)
  const [showSignModal, setShowSignModal] = useState(false)

  const loaQueryKey = ['applicant-loa', isApplicantPortal ? 'me' : applicantId]

  const { data, isLoading } = useQuery<LoaData>({
    queryKey: loaQueryKey,
    queryFn: async () => {
      const url = isApplicantPortal
        ? '/ppdb/applicants/me/loa'
        : `/ppdb/applicants/${applicantId}/loa`
      return await apiFetch<LoaData>(url)
    },
    enabled: open && (isApplicantPortal || !!applicantId),
  })

  const handleDownload = async (format: 'pdf' | 'image') => {
    const targetElement = format === 'pdf'
      ? (activePage === 'both' ? (documentContainerRef.current || hiddenExportRef.current) : (hiddenExportRef.current || documentContainerRef.current))
      : (documentContainerRef.current || hiddenExportRef.current)

    if (!targetElement) {
      toast('error', 'Dokumen LoA belum siap diunduh. Mohon tunggu sebentar.')
      return
    }
    try {
      setIsDownloading(format)
      await downloadLoaDoc({
        containerElement: targetElement,
        format,
        applicantName: data?.applicant?.full_name || 'santri',
        registrationNo: data?.registration_number,
        pageMode: activePage,
      })
      toast('success', `Dokumen LoA berhasil diunduh sebagai ${format === 'pdf' ? 'PDF Resmi' : 'Gambar PNG'}`)
    } catch (err: any) {
      toast('error', err.message || 'Gagal mengunduh dokumen LoA')
    } finally {
      setIsDownloading(null)
    }
  }

  const handleShare = async () => {
    if (!data) return
    try {
      const res = await shareLoaDoc({
        applicantName: data.applicant?.full_name || 'Santri Baru',
        registrationNo: data.registration_number,
      })
      if (res.method === 'clipboard') {
        toast('success', 'Tautan resmi dokumen LoA berhasil disalin ke clipboard')
      } else if (res.shared) {
        toast('success', 'Dokumen LoA berhasil dibagikan')
      }
    } catch (err: any) {
      toast('error', err.message || 'Gagal membagikan dokumen LoA')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleOpenStandalone = () => {
    if (data?.registration_number) {
      window.open(`/loa/${data.registration_number}`, '_blank')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <DialogHeader className="print:hidden pb-3 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <DialogTitle className="text-base text-slate-900 font-bold">
                    Surat Penerimaan Santri Baru (Letter of Acceptance)
                  </DialogTitle>
                  <p className="text-xs text-slate-500 font-mono">
                    {data?.letter_number || 'LoA Resmi PPDB PTDARRAHMAN'}
                  </p>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                {/* Page Selector */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActivePage('both')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      activePage === 'both' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2 Halaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage(1)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      activePage === 1 ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hal 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage(2)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      activePage === 2 ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hal 2
                  </button>
                </div>

                {/* Tombol Bagikan */}
                <Button
                  type="button"
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200 cursor-pointer shadow-2xs"
                  title="Bagikan Dokumen LoA"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Bagikan</span>
                </Button>

                {/* Dropdown Download LoA (PDF / Gambar PNG) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!isDownloading || isLoading || !data}
                      className="h-8 text-xs gap-1.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs font-semibold cursor-pointer"
                    >
                      {isDownloading ? (
                        <>
                          <Clock className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0" />
                          <span>Menyiapkan {isDownloading === 'pdf' ? 'PDF' : 'Gambar'}...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Download LoA</span>
                          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
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
                        <span className="text-[10px] text-slate-500">Standar resmi bersih & tajam</span>
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
                        <span className="text-[10px] text-slate-500">Format gambar resolusi tinggi</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Tombol Standalone Page */}
                {data?.registration_number && (
                  <Button
                    type="button"
                    onClick={handleOpenStandalone}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-200 cursor-pointer shadow-2xs"
                    title="Buka Halaman Penuh"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">URL LoA</span>
                  </Button>
                )}

                {/* Tombol Print Fisik */}
                <Button
                  type="button"
                  onClick={handlePrint}
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Langsung
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-24 text-center text-sm text-slate-500 space-y-2">
              <div className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Menyiapkan dokumen resmi Letter of Acceptance...</p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Data LoA tidak ditemukan.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Status Banner */}
              {data.is_loa_signed ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    LoA Resmi Telah Ditandatangani Digital oleh Orang Tua/Wali ({data.loa_signer_name}) pada {data.loa_signed_at ? new Date(data.loa_signed_at).toLocaleString('id-ID') : '-'}.
                  </span>
                  <Badge variant="success" className="text-[10px] self-start sm:self-auto font-bold uppercase">
                    Konfirmasi 2 Pihak Sah
                  </Badge>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-bold block text-amber-950">Konfirmasi Kelulusan Memerlukan Tanda Tangan Digital di Aplikasi:</span>
                      <span className="text-amber-800 text-[11px] leading-relaxed">
                        Orang Tua / Wali calon santri wajib membubuhkan tanda tangan digital secara langsung di aplikasi ini untuk menyelesaikan konfirmasi 2 pihak.
                      </span>
                    </div>
                  </div>
                  {isApplicantPortal && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowSignModal(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 gap-1.5 self-start sm:self-center shadow-xs cursor-pointer"
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      Tanda Tangani Sekarang
                    </Button>
                  )}
                </div>
              )}

              {/* Document Render View with Ref for Export */}
              <div
                ref={documentContainerRef}
                className="flex justify-start sm:justify-center overflow-x-auto touch-pan-x py-2 pb-6"
              >
                <LoaOfficialDocument data={data} page={activePage} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Container untuk Render LoA Resmi A4 2 Halaman (Presisi Ekspor Bersih) */}
      {data && (
        <div
          ref={hiddenExportRef}
          className="print:hidden"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            visibility: 'visible',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <LoaOfficialDocument data={data} page="both" />
        </div>
      )}

      {/* Modal Tanda Tangan Digital Terpisah */}
      {isApplicantPortal && (
        <ApplicantSignLoAModal
          open={showSignModal}
          onOpenChange={setShowSignModal}
          applicantId={applicantId}
          isApplicantPortal={isApplicantPortal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: loaQueryKey })
            queryClient.invalidateQueries({ queryKey: ['my-loa'] })
            queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
          }}
        />
      )}
    </>
  )
}
