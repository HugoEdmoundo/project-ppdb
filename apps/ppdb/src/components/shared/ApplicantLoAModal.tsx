import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Printer, Award, ShieldAlert } from 'lucide-react'

interface ApplicantLoAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
}

export default function ApplicantLoAModal({
  open,
  onOpenChange,
  applicantId,
}: ApplicantLoAModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-loa', applicantId],
    queryFn: async () => {
      return await apiFetch<any>(`/ppdb/applicants/${applicantId}/loa`)
    },
    enabled: open && !!applicantId,
  })

  const handlePrint = () => {
    window.print()
  }

  const applicant = data?.applicant
  const content = data?.content || ''
  const fixedClause = data?.fixed_clause || 'Seluruh dana yang telah dibayarkan tidak dapat dikembalikan.'
  const letterNumber = data?.letter_number || `LoA/PPDB/${new Date().getFullYear()}/001`
  const isGraduated = data?.is_graduated

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2 text-base text-emerald-800">
              <Award className="h-5 w-5 text-emerald-700 shrink-0" />
              <span>Surat Penerimaan Santri Baru (LoA)</span>
            </DialogTitle>
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 h-9 sm:h-8 text-xs w-full sm:w-auto font-medium">
              <Printer className="h-3.5 w-3.5" /> Cetak / Print LoA
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Menyiapkan dokumen resmi Letter of Acceptance...
          </div>
        ) : !applicant ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Data LoA tidak ditemukan.
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 p-4 sm:p-8 bg-white text-slate-900 border rounded-xl print:border-none print:p-0">
            {/* Status Pratinjau Jika Belum Lulus */}
            {!isGraduated && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800 print:hidden">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  Pratinjau Draf LoA — Pendaftar belum berstatus LULUS resmi.
                </span>
                <Badge variant="warning" className="text-[10px] self-start sm:self-auto">
                  Draft Preview
                </Badge>
              </div>
            )}

            {/* Kop Surat Lembaga */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-base sm:text-xl font-bold uppercase tracking-wider text-emerald-900 leading-snug">
                PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL AR-RAHMAN
              </h2>
              <p className="text-xs font-semibold text-slate-700 tracking-wide uppercase mt-0.5">
                PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Jl. Raya Ar-Rahman, Curug, Gunung Sindur, Bogor, Jawa Barat • Telp/WA: 0812-3456-7890
              </p>
            </div>

            {/* Nomor Surat & Tanggal */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs text-slate-600 border-b pb-2 gap-2">
              <div>
                <p>Nomor: <span className="font-semibold text-slate-900 break-all">{letterNumber}</span></p>
                <p>Lampiran: -</p>
                <p>Perihal: <span className="font-semibold text-slate-900">Surat Penerimaan (Letter of Acceptance)</span></p>
              </div>
              <div className="text-left sm:text-right">
                <p>Bogor, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <Badge variant="success" className="mt-1 text-[10px] uppercase font-bold">
                  Resmi Diterima
                </Badge>
              </div>
            </div>

            {/* Isi Surat Penerimaan (Template Dinamis) */}
            <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-serif space-y-4 break-words">
              {content}
            </div>

            {/* Klausul Tetap Wajib (Hardcoded Spec) */}
            <div className="p-3.5 bg-slate-50 border-l-4 border-emerald-600 text-xs text-slate-700 rounded-r">
              <p className="font-semibold text-slate-900 mb-0.5">Ketentuan Administrasi:</p>
              <p className="italic font-medium text-slate-800 break-words">{fixedClause}</p>
            </div>

            {/* Tanda Tangan & Pengesahan */}
            <div className="pt-6 sm:pt-8 flex justify-end text-center text-xs">
              <div className="w-full sm:w-64">
                <p className="text-slate-600">Pimpinan Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman</p>
                <p className="font-semibold mt-0.5">Ketua PPDB</p>
                <div className="h-20 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 rounded px-2 py-1">
                    [Tanda Tangan & Stempel Resmi]
                  </span>
                </div>
                <p className="font-bold underline text-sm">( Ust. H. Muhammad Ar-Rahman, Lc., M.Ag )</p>
                <p className="text-[10px] text-slate-500 mt-0.5">NIP: 19850412 201001 1 003</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
