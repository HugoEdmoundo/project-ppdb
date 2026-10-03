import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Printer, Image as ImageIcon } from 'lucide-react'

interface ApplicantSKDModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
}

export default function ApplicantSKDModal({
  open,
  onOpenChange,
  applicantId,
}: ApplicantSKDModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-skd', applicantId],
    queryFn: async () => {
      return await apiFetch<any>(`/ppdb/applicants/${applicantId}/skd`)
    },
    enabled: open && !!applicantId,
  })

  const handlePrint = () => {
    window.print()
  }

  const applicant = data?.applicant
  const backgroundUrl = data?.background_url
  const letterNumber = data?.letter_number

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base text-emerald-800">
              <ImageIcon className="h-5 w-5 text-emerald-700" />
              <span>Surat Keterangan Diterima (SKD)</span>
            </DialogTitle>
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
              <Printer className="h-3.5 w-3.5" /> Cetak / Print SKD
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Menyiapkan dokumen SKD...
          </div>
        ) : !applicant ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Data SKD tidak ditemukan.
          </div>
        ) : (
          <div
            ref={printRef}
            className="relative w-full aspect-[1/1.414] bg-white print:p-0 overflow-hidden text-slate-900 border rounded-lg print:border-none"
          >
            {backgroundUrl && (
              <img
                src={backgroundUrl}
                alt="SKD Background"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            )}
            <div className="relative z-10 w-full h-full flex flex-col pt-[30%] px-[15%] pb-[10%]">
              <div className="text-center font-serif space-y-1 mb-8">
                <h2 className="text-xl font-bold tracking-widest text-slate-800">SURAT KETERANGAN DITERIMA</h2>
                <p className="text-xs text-slate-600 font-medium">Nomor: {letterNumber}</p>
              </div>

              <div className="text-sm font-serif leading-relaxed space-y-4">
                <p>
                  Berdasarkan hasil Keputusan Panitia Penerimaan Peserta Didik Baru (PPDB), menerangkan bahwa:
                </p>
                <div className="pl-4 space-y-2 font-medium">
                  <div className="grid grid-cols-[140px_10px_1fr]">
                    <span>Nama Lengkap</span>
                    <span>:</span>
                    <span className="uppercase">{applicant.full_name}</span>
                  </div>
                  <div className="grid grid-cols-[140px_10px_1fr]">
                    <span>No. Pendaftaran</span>
                    <span>:</span>
                    <span>{strLimit(applicant.id, 8).toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-[140px_10px_1fr]">
                    <span>NISN/NIK</span>
                    <span>:</span>
                    <span>{applicant.nisn || applicant.nik || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_10px_1fr]">
                    <span>Jenjang Tujuan</span>
                    <span>:</span>
                    <span>{applicant.registration_level.toUpperCase()}</span>
                  </div>
                </div>
                <p>
                  Dinyatakan <strong>DITERIMA</strong> dan berhak untuk mengikuti pendidikan di Pesantren Tahfidz Ar-Rahman tahun ajaran yang sedang berjalan.
                </p>
                <p>
                  Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
                </p>
              </div>

              <div className="mt-auto pt-8 grid grid-cols-2 text-center text-xs font-serif">
                <div />
                <div>
                  <p>Bogor, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-semibold mb-16">Panitia PPDB</p>
                  <p className="font-bold underline text-sm">Ust. H. Muhammad Ar-Rahman, Lc., M.Ag</p>
                  <p>Ketua Panitia</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function strLimit(str: string, limit: number) {
  if (!str) return '';
  return str.substring(0, limit);
}
