import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Printer, FileText, Brain, Award } from 'lucide-react'

interface ApplicantTranscriptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicantId: string
}

export default function ApplicantTranscriptModal({
  open,
  onOpenChange,
  applicantId,
}: ApplicantTranscriptModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-transcript', applicantId],
    queryFn: async () => {
      return await apiFetch<any>(`/ppdb/applicants/${applicantId}/transcript`)
    },
    enabled: open && !!applicantId,
  })

  const handlePrint = () => {
    window.print()
  }

  const applicant = data?.applicant
  const categories = data?.categories || []
  const tiuScore = data?.tiu_score
  const tiuCompletedAt = data?.tiu_completed_at
  const notes = data?.evaluator_notes
  const graduationStatus = data?.graduation_status

  // Hitung rata-rata skor kriteria jika ada
  let totalCriteriaScore = 0
  let criteriaCount = 0
  categories.forEach((cat: any) => {
    cat.criteria?.forEach((cr: any) => {
      totalCriteriaScore += Number(cr.score || 0)
      criteriaCount++
    })
  })
  const averageRubricScore = criteriaCount > 0 ? (totalCriteriaScore / criteriaCount).toFixed(1) : '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              <span>Transkrip Hasil Seleksi Calon Santri</span>
            </DialogTitle>
            <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
              <Printer className="h-3.5 w-3.5" /> Cetak / Print PDF
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Menyiapkan lembar transkrip nilai...
          </div>
        ) : !applicant ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Data transkrip tidak ditemukan.
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 p-4 sm:p-6 bg-white text-slate-900 border rounded-lg print:border-none print:p-0">
            {/* Kop Lembaga */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-lg font-bold uppercase tracking-wider text-emerald-800">
                PESANTREN TAHFIDZ AR-RAHMAN
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Penerimaan Peserta Didik Baru (PPDB) — Lembar Hasil Seleksi Calon Santri
              </p>
              <p className="text-[11px] text-slate-500 italic mt-0.5">
                Jl. Raya Ar-Rahman, Curug, Gunung Sindur, Bogor, Jawa Barat
              </p>
            </div>

            {/* Identitas Santri */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded border">
              <div>
                <span className="text-slate-500 block">Nama Lengkap</span>
                <span className="font-semibold text-sm text-slate-900">{applicant.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nomor Induk / NISN</span>
                <span className="font-semibold text-sm text-slate-900">{applicant.nisn || applicant.nik || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Jalur & Jenjang Pendaftaran</span>
                <span className="font-medium text-slate-800 capitalize">
                  {applicant.registration_path} / {applicant.registration_level}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Gelombang PPDB</span>
                <span className="font-medium text-slate-800">{applicant.wave_name || '-'}</span>
              </div>
            </div>

            {/* Bagian 1: Hasil Ujian TIU Otomatis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-800">
                  <Brain className="h-4 w-4 text-primary" />
                  1. Tes Inteligensi Umum (TIU)
                </h3>
                <span className="text-[10px] text-slate-500 italic">Sistem Terintegrasi SEB Webhook</span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded bg-slate-50 text-xs">
                <div>
                  <p className="font-medium">Skor Pilihan Ganda TIU</p>
                  <p className="text-[11px] text-slate-500">
                    {tiuCompletedAt ? `Diselesaikan pada ${new Date(tiuCompletedAt).toLocaleString('id-ID')}` : 'Nilai otomatis tersimpan'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-primary">
                    {tiuScore != null ? tiuScore : '—'}
                  </span>
                  <span className="text-xs text-slate-500"> / 100</span>
                </div>
              </div>
            </div>

            {/* Bagian 2: Hasil Ujian Rubrik (Tahfidz & Wawancara) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 text-slate-800">
                  <Award className="h-4 w-4 text-amber-700" />
                  2. Evaluasi Rubrik Penguji (Tahfidz & Wawancara)
                </h3>
                <span className="text-[10px] text-slate-500">Rata-rata: {averageRubricScore} / 100</span>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-4 border rounded text-xs text-slate-500 italic">
                  Belum ada nilai kriteria ujian yang dimasukkan evaluator.
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((cat: any, idx: number) => (
                    <div key={idx} className="border rounded overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 font-semibold text-xs border-b">
                        {cat.category_name}
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50/50 text-slate-500 text-[11px]">
                            <th className="text-left p-2">Kriteria Penilaian</th>
                            <th className="text-center p-2 w-20">Bobot</th>
                            <th className="text-right p-2 w-24">Skor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.criteria?.map((cr: any, cidx: number) => (
                            <tr key={cidx} className="border-b last:border-none">
                              <td className="p-2 font-medium">{cr.criteria_name}</td>
                              <td className="p-2 text-center text-slate-600">{cr.weight ? `${cr.weight}%` : '—'}</td>
                              <td className="p-2 text-right font-bold text-slate-900">{cr.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan Evaluator */}
            {notes && (
              <div className="p-3 border rounded bg-slate-50 text-xs space-y-1">
                <span className="font-semibold text-slate-700 block">Catatan Tim Evaluator:</span>
                <p className="text-slate-800 italic">{notes}</p>
              </div>
            )}

            {/* Keputusan Kelulusan */}
            <div className="flex items-center justify-between p-3.5 border-2 rounded-lg bg-slate-50 text-xs">
              <span className="font-bold text-sm text-slate-800">STATUS AKHIR SELEKSI:</span>
              <Badge
                variant={graduationStatus === 'passed' ? 'success' : graduationStatus === 'failed' ? 'destructive' : 'warning'}
                className="text-xs uppercase px-3 py-1 font-bold"
              >
                {graduationStatus === 'passed' ? 'LULUS SELEKSI' : graduationStatus === 'failed' ? 'TIDAK LULUS' : 'MENUNGGU KEPUTUSAN'}
              </Badge>
            </div>

            {/* Tanda Tangan */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs">
              <div>
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-semibold mt-0.5">Ketua Panitia Seleksi PPDB</p>
                <div className="h-16" />
                <p className="font-bold underline">( Ust. H. Muhammad Ar-Rahman )</p>
              </div>
              <div>
                <p className="text-slate-500">Bogor, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-semibold mt-0.5">Petugas Verifikator / Penguji</p>
                <div className="h-16" />
                <p className="font-bold underline">( Tim Penguji & Wawancara )</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
