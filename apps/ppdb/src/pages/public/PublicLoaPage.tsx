import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import LoaOfficialDocument, { type LoaData } from '@/components/shared/LoaOfficialDocument'
import { Button, Badge } from '@/components/ui'
import {
  Printer,
  AlertCircle,
  Share2,
  Award,
  CheckCircle2,
  Download,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { downloadLoaPdf, downloadLoaImage, downloadAllLoaImages, shareLoaDoc } from '@/utils/exportLoa'

export default function PublicLoaPage() {
  const { registrationNo } = useParams<{ registrationNo: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<1 | 2 | 'both'>('both')
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportLabel, setExportLabel] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-loa', registrationNo],
    queryFn: async () => {
      return await apiFetch<LoaData>(`/ppdb/loa/${registrationNo}`)
    },
    enabled: Boolean(registrationNo),
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDownloadOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getExportPages = () => {
    const container = document.getElementById('loa-export-container')
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>('.loa-page'))
  }

  const handleDownloadPdf = async () => {
    if (!data) return
    setIsDownloadOpen(false)
    setIsExporting(true)
    setExportLabel('Menyiapkan PDF...')
    try {
      const pages = getExportPages()
      if (pages.length === 0) throw new Error('Dokumen LoA tidak ditemukan di layar')
      await downloadLoaPdf(pages, data.applicant?.full_name || 'santri', data.registration_number)
      toast('success', 'Dokumen LoA PDF berhasil diunduh')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh dokumen PDF')
    } finally {
      setIsExporting(false)
      setExportLabel('')
    }
  }

  const handleDownloadAllImages = async () => {
    if (!data) return
    setIsDownloadOpen(false)
    setIsExporting(true)
    setExportLabel('Menyiapkan Gambar...')
    try {
      const pages = getExportPages()
      if (pages.length === 0) throw new Error('Dokumen LoA tidak ditemukan di layar')
      await downloadAllLoaImages(pages, data.applicant?.full_name || 'santri', data.registration_number)
      toast('success', 'Kedua halaman gambar LoA berhasil diunduh')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengunduh gambar LoA')
    } finally {
      setIsExporting(false)
      setExportLabel('')
    }
  }

  const handleDownloadSingleImage = async (pageNo: 1 | 2) => {
    if (!data) return
    setIsDownloadOpen(false)
    setIsExporting(true)
    setExportLabel(`Menyiapkan Gambar Hal ${pageNo}...`)
    try {
      const pages = getExportPages()
      const targetEl = pages[pageNo - 1]
      if (!targetEl) throw new Error(`Halaman ${pageNo} tidak ditemukan`)
      await downloadLoaImage(targetEl, pageNo, data.applicant?.full_name || 'santri', data.registration_number)
      toast('success', `Gambar LoA Halaman ${pageNo} berhasil diunduh`)
    } catch (err: any) {
      toast('error', err?.message || `Gagal mengunduh gambar Halaman ${pageNo}`)
    } finally {
      setIsExporting(false)
      setExportLabel('')
    }
  }

  const handlePrint = () => {
    setIsDownloadOpen(false)
    window.print()
  }

  const handleShare = async () => {
    if (!data) return
    try {
      const res = await shareLoaDoc({
        applicantName: data.applicant?.full_name || 'Santri Baru',
        registrationNo: data.registration_number || registrationNo,
      })
      if (res.method === 'clipboard') {
        toast('success', 'Tautan dokumen LoA berhasil disalin ke clipboard')
      } else if (res.shared) {
        toast('success', 'Dokumen LoA berhasil dibagikan')
      }
    } catch (err: any) {
      toast('error', err?.message || 'Gagal membagikan dokumen LoA')
    }
  }

  const handleBack = () => {
    if (user?.user_type === 'applicant') {
      navigate('/applicant/pengumuman')
    } else if (user) {
      navigate('/admin/review-loa')
    }
  }

  const backLabel = user?.user_type === 'applicant'
    ? 'Kembali ke Dashboard Pendaftar'
    : 'Kembali ke Review LoA Admin'

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center">
      {/* Container untuk Render LoA Resmi A4 (Presisi Tanpa Kotoran Modal/Layar) */}
      {data && (
        <div
          id="loa-export-container"
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

      {/* Back Navigation Bar (Hanya tampil untuk pengguna yang login. Tamu/publik hasil share tidak memiliki CTA back) */}
      {user && (
        <div className="w-full max-w-[840px] mb-3 flex items-center justify-between print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="gap-2 h-9 text-xs bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200 shadow-2xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{backLabel}</span>
          </Button>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            {data?.registration_number || registrationNo}
          </span>
        </div>
      )}

      {/* Top Action Bar (Hidden during print) - Versi Publik Resmi Tanpa CTA Dashboard */}
      <div className="w-full max-w-[840px] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-200 print:hidden">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Letter of Acceptance (LoA) Resmi
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {data?.letter_number || registrationNo}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Page Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'both' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2 Halaman
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 1 ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hal 1
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 2 ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hal 2
            </button>
          </div>

          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs bg-white"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Bagikan</span>
          </Button>

          {/* Download Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              onClick={() => setIsDownloadOpen((prev) => !prev)}
              disabled={isExporting || isLoading || !data}
              size="sm"
              className="gap-1.5 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{exportLabel || 'Memproses...'}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Dokumen</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isDownloadOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </Button>

            {isDownloadOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Format Unduhan LoA
                </div>
                <div className="py-1">
                  <button
                    onClick={handleDownloadPdf}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold">Download PDF (A4)</div>
                      <div className="text-[10px] text-slate-400">2 Halaman Presisi Cetak</div>
                    </div>
                  </button>
                  <button
                    onClick={handleDownloadAllImages}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold">Download Gambar (Semua Hal)</div>
                      <div className="text-[10px] text-slate-400">Unduh Hal 1 & 2 Sekaligus (PNG)</div>
                    </div>
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => handleDownloadSingleImage(1)}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    <div>
                      <div className="font-medium">Download Gambar Hal 1</div>
                      <div className="text-[10px] text-slate-400">Surat Penerimaan Santri (PNG)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDownloadSingleImage(2)}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    <div>
                      <div className="font-medium">Download Gambar Hal 2</div>
                      <div className="text-[10px] text-slate-400">Tata Cara Pembayaran & Aturan (PNG)</div>
                    </div>
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={handlePrint}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <div>
                      <div className="font-medium">Cetak Dokumen (Browser)</div>
                      <div className="text-[10px] text-slate-400">Kirim langsung ke Mesin Printer</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Alert if signed */}
      {data?.is_loa_signed && (
        <div className="w-full max-w-[840px] mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Dokumen telah <strong>dikonfirmasi dan ditandatangani secara digital</strong> oleh orang tua/wali ({data.loa_signer_name}) pada {data.loa_signed_at ? new Date(data.loa_signed_at).toLocaleString('id-ID') : '-'}.
            </span>
          </div>
          <Badge variant="success" className="text-[10px] shrink-0 font-bold uppercase">
            Sah 2 Pihak
          </Badge>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="w-full max-w-[794px] h-[600px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
          <div className="h-8 w-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Memuat dokumen resmi Letter of Acceptance...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-red-200 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Dokumen LoA Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mt-1">
              Data Letter of Acceptance dengan nomor registrasi atau ID <code className="font-mono font-bold text-slate-700">{registrationNo}</code> tidak ditemukan pada sistem PPDB.
            </p>
          </div>
        </div>
      )}

      {/* Document View */}
      {data && (
        <div className="overflow-x-auto touch-pan-x w-full flex justify-start sm:justify-center py-2">
          <LoaOfficialDocument data={data} page={activeTab} />
        </div>
      )}
    </div>
  )
}
