import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Input,
  Label,
  Card,
  CardContent,
} from '@/components/ui'
import {
  Printer,
  Award,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PenTool,
  Send,
} from 'lucide-react'
import LoaOfficialDocument, { type LoaData } from './LoaOfficialDocument'
import DigitalSignaturePad, { type DigitalSignaturePadRef } from './DigitalSignaturePad'
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
  const sigPadRef = useRef<DigitalSignaturePadRef | null>(null)

  const [activePage, setActivePage] = useState<1 | 2 | 'both'>('both')
  const [signerName, setSignerName] = useState('')
  const [signerRelation, setSignerRelation] = useState<'Ayah' | 'Ibu' | 'Wali'>('Ayah')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

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

  // Pre-fill parent name when data is loaded
  useState(() => {
    if (data?.applicant?.parent_name && !signerName) {
      setSignerName(data.applicant.parent_name)
    }
  })

  const signMutation = useMutation({
    mutationFn: async () => {
      return await apiFetch('/ppdb/applicants/me/sign-loa', {
        method: 'POST',
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_relation: signerRelation,
          signature_data: signatureData,
        }),
      })
    },
    onSuccess: () => {
      toast('success', 'Letter of Acceptance berhasil ditandatangani secara digital!')
      queryClient.invalidateQueries({ queryKey: loaQueryKey })
      queryClient.invalidateQueries({ queryKey: ['my-loa'] })
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      queryClient.invalidateQueries({ queryKey: ['signed-loa-applicants'] })
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal menandatangani LoA')
    },
  })

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signerName.trim()) {
      toast('error', 'Nama orang tua / wali penandatangan wajib diisi')
      return
    }
    const sig = sigPadRef.current?.getDataUrl() || signatureData
    if (!sig) {
      toast('error', 'Mohon bubuhkan tanda tangan digital pada kotak yang disediakan')
      return
    }
    if (!agreeTerms) {
      toast('error', 'Anda wajib mencentang persetujuan ketentuan LoA')
      return
    }
    setSignatureData(sig)
    signMutation.mutate()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
        <DialogHeader className="print:hidden pb-3 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-700 shrink-0" />
              <div>
                <DialogTitle className="text-base text-slate-900 font-bold">
                  Surat Penerimaan Santri Baru (Letter of Acceptance)
                </DialogTitle>
                <p className="text-xs text-slate-500 font-mono">
                  {data?.letter_number || 'LoA Resmi PPDB Ar-Rahman'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Page Selector */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActivePage('both')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activePage === 'both' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2 Halaman
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(1)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activePage === 1 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hal 1
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage(2)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    activePage === 2 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hal 2
                </button>
              </div>

              {data?.registration_number && (
                <Button
                  onClick={handleOpenStandalone}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs bg-white text-slate-700"
                  title="Buka Halaman Penuh"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">URL LoA</span>
                </Button>
              )}

              <Button
                onClick={handlePrint}
                size="sm"
                className="gap-1.5 h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak / Print PDF
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
          <div className="space-y-6 pt-2">
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
                    onClick={() => {
                      document.getElementById('loa-signature-card')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 gap-1.5 self-start sm:self-center shadow-xs"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    Tanda Tangani Sekarang ↓
                  </Button>
                )}
              </div>
            )}

            {/* Document Render View */}
            <div className="flex justify-start sm:justify-center overflow-x-auto touch-pan-x py-2">
              <LoaOfficialDocument data={data} page={activePage} />
            </div>

            {/* FORM TANDA TANGAN DIGITAL (Hanya tampil jika belum ditandatangani dan di portal pendaftar) */}
            {!data.is_loa_signed && isApplicantPortal && (
              <Card id="loa-signature-card" className="border-emerald-300 bg-white shadow-md rounded-2xl overflow-hidden mt-6 scroll-mt-6">
                <div className="bg-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PenTool className="h-5 w-5 text-emerald-300" />
                    <div>
                      <h4 className="font-bold text-sm sm:text-base">
                        Form Konfirmasi Penerimaan & Tanda Tangan Digital Dua Pihak
                      </h4>
                      <p className="text-xs text-emerald-200">
                        Wajib ditandatangani oleh Orang Tua / Wali calon santri sebagai bukti penerimaan resmi.
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-800 text-emerald-200 border-emerald-700 text-[10px] uppercase">
                    Langkah Terakhir
                  </Badge>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  <form onSubmit={handleSignSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Nama Lengkap Orang Tua / Wali Penandatangan <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Masukkan nama lengkap orang tua/wali"
                          required
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Hubungan dengan Calon Santri <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-3 pt-1">
                          {(['Ayah', 'Ibu', 'Wali'] as const).map((rel) => (
                            <label
                              key={rel}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                signerRelation === rel
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="signer_relation"
                                value={rel}
                                checked={signerRelation === rel}
                                onChange={() => setSignerRelation(rel)}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>{rel}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Canvas Tanda Tangan */}
                    <div className="space-y-1.5 pt-1">
                      <DigitalSignaturePad
                        ref={sigPadRef}
                        onSignatureChange={(url) => setSignatureData(url)}
                      />
                    </div>

                    {/* Klausul Persetujuan Checkbox */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 leading-relaxed">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                          required
                        />
                        <span>
                          Saya menyatakan dengan sadar bahwa data yang diisi adalah benar, telah membaca seluruh isi Letter of Acceptance (LoA) ini, dan menyetujui seluruh ketentuan administratif yang berlaku termasuk klausul resmi bahwa{' '}
                          <strong className="text-slate-900 underline">
                            seluruh dana yang telah dibayarkan tidak dapat dikembalikan dengan alasan apapun (non-refundable)
                          </strong>.
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={signMutation.isPending}
                        className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-6 shadow-sm"
                      >
                        <Send className="h-4 w-4" />
                        {signMutation.isPending ? 'Menyimpan Tanda Tangan...' : 'Kirim Konfirmasi & Tanda Tangani LoA'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
