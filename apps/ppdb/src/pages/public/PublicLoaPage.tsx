import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import LoaOfficialDocument, { type LoaData } from '@/components/shared/LoaOfficialDocument'
import { Button, Badge } from '@/components/ui'
import { Printer, ArrowLeft, AlertCircle, Share2, Award, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function PublicLoaPage() {
  const { registrationNo } = useParams<{ registrationNo: string }>()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<1 | 2 | 'both'>('both')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-loa', registrationNo],
    queryFn: async () => {
      return await apiFetch<LoaData>(`/ppdb/loa/${registrationNo}`)
    },
    enabled: Boolean(registrationNo),
  })

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Letter of Acceptance PPDB - ${data?.applicant?.full_name || ''}`,
          url: window.location.href,
        })
      } catch {
        // Ignored if aborted
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast('success', 'Tautan dokumen LoA berhasil disalin ke clipboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center">
      {/* Top Action Bar (Hidden during print) */}
      <div className="w-full max-w-[840px] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-200 print:hidden">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/admin/review-loa"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Kembali ke Review LoA"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <h1 className="text-sm sm:text-base font-bold text-slate-900">
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

          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-1.5 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak / Simpan PDF</span>
          </Button>
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
