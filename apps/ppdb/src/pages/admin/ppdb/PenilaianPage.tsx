import { useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import { Card, CardContent } from "@/components/ui"
import { Button } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { ArrowRight, Activity, Award, CheckCircle2, XCircle, Clock, Brain, BookOpen, MessageSquare, Printer, Info, UserCheck, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Applicant } from '@/types/ppdb'
import NoActiveWaveBanner from '@/components/shared/NoActiveWaveBanner'
import PaginationControls from '@/components/shared/PaginationControls'
import PageHeaderCard from '@/components/shared/PageHeaderCard'
import ToolbarCard from '@/components/shared/ToolbarCard'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { cn } from '@/lib/utils'

function SelectionBadge({ status }: { status?: string }) {
  if (status === 'passed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Lulus
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Tidak Lulus
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Tahap Seleksi
    </span>
  )
}

function initials(name?: string) {
  return (name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface ScoreDetailModalProps {
  applicant: Applicant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChanged?: () => void
}

function ScoreDetailModal({ applicant, open, onOpenChange, onStatusChanged }: ScoreDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { canCrud } = useCan('ppdb', 'crud')
  const queryClient = useQueryClient()
  const [verdictMode, setVerdictMode] = useState<'passed' | 'failed' | 'selection' | null>(null)
  const [verdictReason, setVerdictReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['applicant-transcript-view', applicant?.id],
    queryFn: async () => {
      if (!applicant?.id) return null
      return await api.apiFetch<any>(`/ppdb/applicants/${applicant.id}/transcript`)
    },
    enabled: open && !!applicant?.id,
  })

  const verdictMutation = useMutation({
    mutationFn: (payload: { status: string; reason?: string }) =>
      api.apiFetch(`/selection/applicants/${applicant!.id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast('success', verdictMode === 'passed' ? 'Pendaftar dinyatakan LULUS seleksi' : 'Pendaftar dinyatakan TIDAK LULUS seleksi')
      queryClient.invalidateQueries({ queryKey: ['applicant-transcript-view', applicant?.id] })
      queryClient.invalidateQueries({ queryKey: ['applicants-selection-results'] })
      setVerdictMode(null)
      setVerdictReason('')
      onStatusChanged?.()
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan keputusan'),
  })

  const handleConfirmVerdict = () => {
    if (!verdictMode) return
    verdictMutation.mutate({ status: verdictMode, reason: verdictReason.trim() || undefined })
  }


  if (!applicant) return null

  const handlePrint = () => {
    window.print()
  }

  const appData = data?.applicant || applicant
  const categories: any[] = data?.categories || []
  const tiuScore = data?.tiu_score
  const tiuCompletedAt = data?.tiu_completed_at
  const evaluatorNotes = data?.evaluator_notes
  const graduationStatus = data?.graduation_status || applicant.status

  const isTiuPath = ['reguler', 'umum', 'seleksi', 'tes'].some(p =>
    (appData.registration_path || '').toLowerCase().includes(p)
  )

  const tahfidzCategory = categories.find(c => c.category_name?.toLowerCase().includes('tahfidz'))
  const wawancaraCategory = categories.find(c => c.category_name?.toLowerCase().includes('wawancara'))
  const otherCategories = categories.filter(c => c !== tahfidzCategory && c !== wawancaraCategory)

  const calculateAvg = (criteriaList?: any[]) => {
    if (!criteriaList || criteriaList.length === 0) return null
    const validScores = criteriaList.filter(c => c.score != null && !isNaN(Number(c.score)))
    if (validScores.length === 0) return null
    const total = validScores.reduce((acc, c) => acc + Number(c.score), 0)
    return (total / validScores.length).toFixed(1)
  }

  const tahfidzAvg = calculateAvg(tahfidzCategory?.criteria)
  const wawancaraAvg = calculateAvg(wawancaraCategory?.criteria)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                Hasil Seleksi Pendaftar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Rekapitulasi hasil penilaian murni (TIU otomatis via webhook & evaluasi rubrik). Validasi kelulusan dilakukan oleh admin.
              </DialogDescription>
            </div>
            <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0">
              <Printer className="h-3.5 w-3.5" /> Cetak Lembar
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Clock className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
            Memuat lembar hasil nilai seleksi...
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 pt-2">
            {/* Kartu Profil Santri */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nama Lengkap Santri</span>
                <span className="font-bold text-sm text-slate-800">{appData.full_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">NISN / NIK</span>
                <span className="font-semibold text-slate-700">{appData.nisn || appData.nik || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Jalur Pendaftaran</span>
                <span className="font-medium text-slate-700 capitalize">{appData.registration_path || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Gelombang PPDB</span>
                <span className="font-medium text-slate-700">{appData.wave_name || '—'}</span>
              </div>
            </div>

            {/* SEKSI 1: HASIL TES TIU (Tes Inteligensi Umum) */}
            <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">1. Hasil Tes Inteligensi Umum (TIU)</h4>
                    <p className="text-[11px] text-muted-foreground">Ujian SEB (Safe Exam Browser) · Sinkronisasi Otomatis Webhook</p>
                  </div>
                </div>
                {isTiuPath && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50/50 text-blue-700 border-blue-200">
                    Jalur Seleksi
                  </Badge>
                )}
              </div>

              {!isTiuPath && tiuScore == null ? (
                <div className="p-3 bg-slate-50 border border-dashed rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Jalur pendaftaran ini tidak mewajibkan ujian pilihan ganda TIU.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-blue-50/40 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-900 font-medium">Skor Pilihan Ganda TIU</p>
                      <p className="text-[10px] text-blue-700/80">Skala 0 - 100</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-700">
                        {tiuScore != null ? tiuScore : '—'}
                      </span>
                      <span className="text-xs text-blue-900 font-medium"> / 100</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex flex-col justify-center">
                    <span className="text-muted-foreground text-[11px]">Waktu Penyelesaian:</span>
                    <span className="font-medium text-slate-700 mt-0.5">
                      {tiuCompletedAt
                        ? new Date(tiuCompletedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'
                        : tiuScore != null ? 'Tercatat di sistem' : 'Belum mengikuti ujian TIU'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SEKSI 2: HASIL TES TAHFIDZ */}
            <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">2. Hasil Uji Tahfidz Al-Qur'an</h4>
                    <p className="text-[11px] text-muted-foreground">Penilaian Penguji Tahfidz Sesuai Rubrik</p>
                  </div>
                </div>
                {tahfidzAvg && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                    Rata-rata: {tahfidzAvg} / 100
                  </Badge>
                )}
              </div>

              {tahfidzCategory && tahfidzCategory.criteria && tahfidzCategory.criteria.length > 0 ? (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-[11px]">
                        <th className="text-left py-2 px-3 font-semibold">Kriteria Penilaian</th>
                        <th className="text-center py-2 px-3 w-24 font-semibold">Bobot</th>
                        <th className="text-right py-2 px-3 w-28 font-semibold">Skor Perolehan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tahfidzCategory.criteria.map((cr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700">{cr.criteria_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {cr.score != null ? cr.score : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
                  Belum ada nilai ujian Tahfidz yang tersimpan untuk pendaftar ini.
                </div>
              )}
            </div>

            {/* SEKSI 3: HASIL TES WAWANCARA */}
            <div className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">3. Hasil Uji Wawancara</h4>
                    <p className="text-[11px] text-muted-foreground">Penilaian Pewawancara Sesuai Rubrik</p>
                  </div>
                </div>
                {wawancaraAvg && (
                  <Badge variant="outline" className="text-xs font-bold text-amber-700 bg-amber-50 border-amber-200">
                    Rata-rata: {wawancaraAvg} / 100
                  </Badge>
                )}
              </div>

              {wawancaraCategory && wawancaraCategory.criteria && wawancaraCategory.criteria.length > 0 ? (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-[11px]">
                        <th className="text-left py-2 px-3 font-semibold">Kriteria Penilaian</th>
                        <th className="text-center py-2 px-3 w-24 font-semibold">Bobot</th>
                        <th className="text-right py-2 px-3 w-28 font-semibold">Skor Perolehan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wawancaraCategory.criteria.map((cr: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700">{cr.criteria_name}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {cr.score != null ? cr.score : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
                  Belum ada nilai ujian Wawancara yang tersimpan untuk pendaftar ini.
                </div>
              )}
            </div>

            {/* SEKSI LAIN (JIKA ADA KATEGORI RUBRIK LAIN) */}
            {otherCategories.map((cat, cIdx) => (
              <div key={cIdx} className="space-y-2 border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-sm text-slate-800">{cat.category_name}</h4>
                  {calculateAvg(cat.criteria) && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      Rata-rata: {calculateAvg(cat.criteria)}
                    </Badge>
                  )}
                </div>
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-[11px]">
                        <th className="text-left py-2 px-3 font-semibold">Kriteria</th>
                        <th className="text-center py-2 px-3 w-24 font-semibold">Bobot</th>
                        <th className="text-right py-2 px-3 w-28 font-semibold">Skor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cat.criteria?.map((cr: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-700">{cr.criteria_name}</td>
                          <td className="py-2 px-3 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{cr.score != null ? cr.score : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* CATATAN TIM EVALUATOR */}
            {evaluatorNotes && (
              <div className="p-3.5 bg-slate-50 border rounded-xl text-xs space-y-1">
                <span className="font-semibold text-slate-700 block">Catatan Tim Evaluator:</span>
                <p className="text-slate-700 italic">{evaluatorNotes}</p>
              </div>
            )}

            {/* STATUS KEPUTUSAN & VALIDASI KELULUSAN */}
            <div className={cn(
              "border-2 rounded-xl overflow-hidden",
              graduationStatus === 'passed' ? 'border-emerald-200' :
              graduationStatus === 'failed' ? 'border-red-200' : 'border-slate-200'
            )}>
              {/* Status Row */}
              <div className={cn(
                "flex items-center justify-between p-4",
                graduationStatus === 'passed' ? 'bg-emerald-50' :
                graduationStatus === 'failed' ? 'bg-red-50' : 'bg-slate-50'
              )}>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-slate-700" />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">Status Hasil Seleksi</span>
                    <span className="text-[11px] text-muted-foreground">Keputusan kelulusan calon santri</span>
                  </div>
                </div>
                <Badge
                  variant={graduationStatus === 'passed' ? 'success' : graduationStatus === 'failed' ? 'destructive' : 'warning'}
                  className="text-xs uppercase px-3 py-1 font-bold"
                >
                  {graduationStatus === 'passed' ? 'LULUS SELEKSI' : graduationStatus === 'failed' ? 'TIDAK LULUS' : 'DALAM PROSES SELEKSI'}
                </Badge>
              </div>

              {/* Tombol Validasi — hanya tampil jika admin punya hak */}
              {canCrud && !verdictMode && (
                <div className="px-4 py-3 border-t border-slate-200/80 bg-white flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {graduationStatus === 'selection' || !graduationStatus
                      ? 'Tentukan keputusan kelulusan pendaftar ini.'
                      : 'Ubah keputusan yang sudah ditetapkan.'}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {graduationStatus !== 'passed' && (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setVerdictMode('passed')}
                        disabled={verdictMutation.isPending}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Lulus
                      </Button>
                    )}
                    {graduationStatus !== 'failed' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => setVerdictMode('failed')}
                        disabled={verdictMutation.isPending}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Tidak Lulus
                      </Button>
                    )}
                    {(graduationStatus === 'passed' || graduationStatus === 'failed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 text-slate-600"
                        onClick={() => setVerdictMode('selection')}
                        disabled={verdictMutation.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset ke Seleksi
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Panel konfirmasi inline */}
              {canCrud && verdictMode && (
                <div className={cn(
                  "px-4 py-4 border-t space-y-3",
                  verdictMode === 'passed' ? 'bg-emerald-50/60 border-emerald-200' :
                  verdictMode === 'failed' ? 'bg-red-50/60 border-red-200' : 'bg-amber-50/60 border-amber-200'
                )}>
                  <p className={cn(
                    "text-xs font-semibold",
                    verdictMode === 'passed' ? 'text-emerald-800' :
                    verdictMode === 'failed' ? 'text-red-800' : 'text-amber-800'
                  )}>
                    {verdictMode === 'passed'
                      ? '✅ Konfirmasi: Nyatakan pendaftar ini LULUS seleksi?'
                      : verdictMode === 'failed'
                      ? '❌ Konfirmasi: Nyatakan pendaftar ini TIDAK LULUS seleksi?'
                      : '↩️ Konfirmasi: Reset status ke Dalam Proses Seleksi?'}
                  </p>
                  <Textarea
                    placeholder={
                      verdictMode === 'passed'
                        ? 'Catatan tambahan (opsional)...'
                        : 'Alasan tidak lulus / catatan evaluator (opsional)...'
                    }
                    value={verdictReason}
                    onChange={e => setVerdictReason(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => { setVerdictMode(null); setVerdictReason('') }}
                      disabled={verdictMutation.isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      className={cn("h-8 text-xs gap-1.5",
                        verdictMode === 'passed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                        verdictMode === 'failed' ? 'bg-destructive hover:bg-destructive/90 text-white' :
                        'bg-amber-600 hover:bg-amber-700 text-white'
                      )}
                      onClick={handleConfirmVerdict}
                      disabled={verdictMutation.isPending}
                    >
                      {verdictMutation.isPending ? 'Menyimpan...' : 'Ya, Konfirmasi'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function PenilaianPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  const { data, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['applicants-selection-results', searchQuery, page, limit, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (searchQuery) qs.append('search', searchQuery)
      if (statusFilter) qs.append('status', statusFilter)
      qs.append('page', page.toString())
      qs.append('perPage', limit.toString())
      qs.append('wave_id', 'active')

      const res = await api.apiFetch<{ data: Applicant[], total: number, active_wave: any }>(`/ppdb/applicants?${qs.toString()}`)
      return res
    }
  })

  const applicants = data?.data || []
  const activeWaveData = data?.active_wave && typeof data.active_wave === 'object' ? data.active_wave : null
  const hasActiveWave = !!activeWaveData
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const handleFilterChange = (status: string) => {
    if (status) {
      setSearchParams({ status })
    } else {
      setSearchParams({})
    }
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Hasil Pendaftaran"
        description="Rekapitulasi hasil seleksi calon santri — nilai TIU (otomatis via webhook), Tahfidz, dan Wawancara. Admin dapat memvalidasi kelulusan di sini."
        loading={loading}
        docKey="ppdb-penilaian"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 w-fit rounded-full px-4">
            <Link to="/admin/periods" className="gap-1.5">
              Kelola Gelombang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
        blocks={[
          { icon: Activity, label: 'Gelombang Aktif', value: activeWaveData?.name || 'Tidak ada', active: hasActiveWave, pulse: hasActiveWave },
          { icon: Award, label: 'Peserta Seleksi', value: data?.total != null ? `${data.total} santri` : '—', active: true },
        ]}
      />

      {!loading && hasActiveWave === false && (
        <NoActiveWaveBanner message="Tidak ada gelombang yang aktif saat ini. Aktifkan gelombang terlebih dahulu untuk melihat hasil seleksi." />
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full"
          onClick={() => handleFilterChange('')}
        >
          Semua Status
        </Button>
        <Button
          variant={statusFilter === 'selection' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('selection')}
        >
          <Clock className="h-3.5 w-3.5" /> Dalam Seleksi
        </Button>
        <Button
          variant={statusFilter === 'passed' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('passed')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Lulus
        </Button>
        <Button
          variant={statusFilter === 'failed' ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs rounded-full gap-1.5"
          onClick={() => handleFilterChange('failed')}
        >
          <XCircle className="h-3.5 w-3.5" /> Tidak Lulus
        </Button>
      </div>

      <ToolbarCard
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearch}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-primary/5 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 text-left">Nama Pendaftar</th>
                  <th className="py-3 px-4 text-left">Email / No. WA</th>
                  <th className="py-3 px-4 text-left">Jalur Pendaftaran</th>
                  <th className="py-3 px-4 text-left">Skor TIU</th>
                  <th className="py-3 px-4 text-left">Status Seleksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={5} className="py-4 px-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : applicants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                      Belum ada pendaftar yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() => setSelectedApplicant(applicant)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      title="Klik untuk melihat lembar hasil seleksi & validasi kelulusan"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-primary to-emerald-dark text-xs font-bold text-white shadow-sm shadow-emerald-primary/20">
                            {initials(applicant.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800">{applicant.full_name}</div>
                            <div className="text-[11px] text-muted-foreground">{applicant.wave_name || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{applicant.email || '-'}</div>
                        <div className="text-xs text-muted-foreground">{applicant.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize text-xs font-medium">
                          {applicant.registration_path || '-'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {(applicant as any).tiu_score != null ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {(applicant as any).tiu_score}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <SelectionBadge status={applicant.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Modal Lembar Hasil Nilai Seleksi & Validasi Kelulusan */}
      <ScoreDetailModal
        applicant={selectedApplicant}
        open={!!selectedApplicant}
        onOpenChange={(v) => !v && setSelectedApplicant(null)}
        onStatusChanged={() => refetch()}
      />
    </div>
  )
}
