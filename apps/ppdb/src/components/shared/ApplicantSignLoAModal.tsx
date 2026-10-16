import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { PenTool, Send, X, ShieldAlert } from 'lucide-react'
import DigitalSignaturePad, { type DigitalSignaturePadRef } from './DigitalSignaturePad'
import { useToast } from '@/components/Toast'
import type { LoaData } from './LoaOfficialDocument'

interface ApplicantSignLoAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId?: string
  isApplicantPortal?: boolean
  onSuccess?: () => void
}

export default function ApplicantSignLoAModal({
  open,
  onOpenChange,
  applicantId,
  isApplicantPortal = true,
  onSuccess,
}: ApplicantSignLoAModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const sigPadRef = useRef<DigitalSignaturePadRef | null>(null)

  const [signerName, setSignerName] = useState('')
  const [signerRelation, setSignerRelation] = useState<'Ayah' | 'Ibu' | 'Wali'>('Ayah')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const loaQueryKey = ['applicant-loa', isApplicantPortal ? 'me' : applicantId]

  const { data } = useQuery<LoaData>({
    queryKey: loaQueryKey,
    queryFn: async () => {
      const url = isApplicantPortal
        ? '/ppdb/applicants/me/loa'
        : `/ppdb/applicants/${applicantId}/loa`
      return await apiFetch<LoaData>(url)
    },
    enabled: open,
  })

  // Pre-fill parent name when data is loaded
  useEffect(() => {
    if (data?.applicant?.parent_name && !signerName) {
      setSignerName(data.applicant.parent_name)
    }
  }, [data?.applicant?.parent_name, signerName])

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
      onOpenChange(false)
      onSuccess?.()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <PenTool className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Tanda Tangan Digital Orang Tua / Wali
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Konfirmasi resmi penerimaan calon santri pada dokumen Letter of Acceptance (LoA).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSignSubmit} className="space-y-4 pt-2">
          {/* Info Santri Singkat */}
          {data?.applicant && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex justify-between items-center gap-2">
              <div>
                <span className="text-[11px] text-slate-500 block">Nama Calon Santri:</span>
                <span className="font-bold text-slate-900 text-sm">{data.applicant.full_name}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">No. Registrasi:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {data.registration_number || data.applicant.id?.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Form Input Nama Penandatangan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Nama Lengkap Orang Tua / Wali Penandatangan <span className="text-red-500">*</span>
            </Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Contoh: H. Ahmad Subagio, S.T."
              required
              className="text-xs h-10 rounded-xl border-slate-200 focus:border-emerald-500"
            />
          </div>

          {/* Hubungan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Hubungan dengan Calon Santri <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {(['Ayah', 'Ibu', 'Wali'] as const).map((rel) => (
                <label
                  key={rel}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    signerRelation === rel
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="signer_relation"
                    value={rel}
                    checked={signerRelation === rel}
                    onChange={() => setSignerRelation(rel)}
                    className="text-emerald-600 focus:ring-emerald-500 sr-only"
                  />
                  <span>{rel}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Canvas Tanda Tangan */}
          <div className="space-y-1 pt-1">
            <DigitalSignaturePad
              ref={sigPadRef}
              onSignatureChange={(url) => setSignatureData(url)}
              className="w-full"
            />
            <p className="text-[11px] text-slate-400">
              Goreskan tanda tangan menggunakan jari atau stylus. Di ponsel, goresan langsung terkunci tanpa menggeser layar.
            </p>
          </div>

          {/* Klausul Persetujuan Checkbox */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>Klausul Resmi PPDB (Non-Refundable)</span>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 leading-relaxed">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                required
              />
              <span className="text-[11px] text-slate-700 leading-snug">
                Saya menyatakan bahwa data yang diisi benar dan menyetujui seluruh ketentuan administratif LoA termasuk klausul bahwa{' '}
                <strong className="text-slate-900 font-semibold underline">
                  seluruh dana yang telah dibayarkan tidak dapat dikembalikan dengan alasan apapun
                </strong>.
              </span>
            </label>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={signMutation.isPending}
              className="h-10 text-xs px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Batal
            </Button>
            <Button
              type="submit"
              disabled={signMutation.isPending}
              className="h-10 text-xs px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-2 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              {signMutation.isPending ? 'Menyimpan Tanda Tangan...' : 'Kirim & Tanda Tangani LoA'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
