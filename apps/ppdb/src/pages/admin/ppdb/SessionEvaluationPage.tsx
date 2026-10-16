import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import {
  Button,
  Badge,
  Textarea,
} from '@/components/ui'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  Users,
  HeartPulse,
  FileText,
  FileCheck,
  Save,
  ExternalLink,
  Phone,
  Mail,
  Home,
  AlertCircle,
  School,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SessionEvaluationPage() {
  const { sessionType = 'tahfidz', sessionId } = useParams<{
    sessionType: string
    sessionId: string
  }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isTahfidz = sessionType.toLowerCase().includes('tahfidz')
  const sessionLabel = isTahfidz ? 'Ujian Tahfidz' : 'Wawancara'

  // Tab switch for screens smaller than lg (mobile & tablet)
  const [mobileTab, setMobileTab] = useState<'rubric' | 'dossier'>('rubric')

  // Fetch session evaluation details (includes session, full applicant profile, and rubric)
  const { data, isLoading, error } = useQuery({
    queryKey: ['session-evaluation', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('ID Sesi tidak ditemukan')
      return await api.apiFetch<any>(`/selection/sessions/${sessionId}/evaluation`)
    },
    enabled: !!sessionId,
  })

  // State for rubric scores
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<string>('')

  // Helper untuk membaca dan memisahkan catatan Tahfidz dan Wawancara
  const parseNotes = (raw?: string | null) => {
    if (!raw) return { tahfidz: '', wawancara: '', general: '' }
    const text = raw.trim()
    const tahfidzMatch = text.match(/(?:^|\n)\[Tahfidz\]:\s*([\s\S]*?)(?=(?:\n\[|$))/i)
    const wawancaraMatch = text.match(/(?:^|\n)\[Wawancara\]:\s*([\s\S]*?)(?=(?:\n\[|$))/i)
    if (tahfidzMatch || wawancaraMatch) {
      return {
        tahfidz: tahfidzMatch ? tahfidzMatch[1].trim() : '',
        wawancara: wawancaraMatch ? wawancaraMatch[1].trim() : '',
        general: '',
      }
    }
    return { tahfidz: '', wawancara: '', general: text }
  }

  // Helper untuk menggabungkan catatan Tahfidz dan Wawancara saat simpan
  const buildNotes = (newNote: string, existingRaw?: string | null) => {
    const parsed = parseNotes(existingRaw)
    const trimmed = newNote.trim()
    const tahfidzNote = isTahfidz ? trimmed : parsed.tahfidz
    const wawancaraNote = !isTahfidz ? trimmed : parsed.wawancara

    const parts: string[] = []
    if (tahfidzNote) parts.push(`[Tahfidz]: ${tahfidzNote}`)
    if (wawancaraNote) parts.push(`[Wawancara]: ${wawancaraNote}`)

    if (parts.length === 0 && parsed.general) {
      return parsed.general
    }
    return parts.join('\n')
  }

  // Initialize scores and notes when data arrives
  useEffect(() => {
    if (data) {
      if (data.existing_scores) {
        setScores(data.existing_scores)
      }
      if (data.evaluator_notes) {
        const parsed = parseNotes(data.evaluator_notes)
        if (isTahfidz) {
          setNotes(parsed.tahfidz || parsed.general || '')
        } else {
          setNotes(parsed.wawancara || parsed.general || '')
        }
      }
    }
  }, [data, isTahfidz])

  // Save scores mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data?.applicant?.id) throw new Error('Data pendaftar tidak ada')

      const scoreItems = Object.entries(scores).map(([criteriaId, val]) => ({
        criteria_id: criteriaId,
        score: Number(val),
      }))

      if (scoreItems.length === 0) {
        throw new Error('Masukkan minimal satu nilai kriteria rubrik')
      }

      const combinedNotes = buildNotes(notes, data.evaluator_notes)

      return await api.apiFetch('/selection/results', {
        method: 'POST',
        body: JSON.stringify({
          applicant_id: data.applicant.id,
          scores: scoreItems,
          notes: combinedNotes.trim() || undefined,
        }),
      })
    },
    onSuccess: () => {
      toast('success', `Nilai ${sessionLabel} berhasil disimpan!`)
      queryClient.invalidateQueries({ queryKey: ['session-evaluation', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['selection-sessions'] })
    },
    onError: (err: any) => {
      toast('error', err.message || 'Gagal menyimpan nilai evaluasi')
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            Memuat lembar penilaian & data lengkap pendaftar...
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center p-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Gagal Membuka Sesi</h2>
        <p className="max-w-md text-sm text-slate-600">
          {(error as any)?.message || 'Sesi ini belum diambil oleh calon santri atau tidak ditemukan.'}
        </p>
        <Button
          onClick={() => navigate(`/admin/sessions/${isTahfidz ? 'tahfidz' : 'wawancara'}`)}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Sesi
        </Button>
      </div>
    )
  }

  const { session, applicant, categories } = data

  // All criteria flat list
  const allCriteria = categories.flatMap((cat: any) =>
    (cat.criteria || []).map((cr: any) => ({
      ...cr,
      categoryName: cat.name,
    }))
  )

  // Calculate weighted or average final score
  const totalWeight = allCriteria.reduce((sum: number, c: any) => sum + (c.weight || 0), 0)
  const isWeighted = totalWeight > 0

  let calculatedScore: number
  let filledCriteriaCount = 0

  if (isWeighted) {
    let weightedSum = 0
    allCriteria.forEach((c: any) => {
      if (scores[c.id] !== undefined && !isNaN(scores[c.id])) {
        weightedSum += (scores[c.id] * (c.weight || 0)) / 100
        filledCriteriaCount++
      }
    })
    calculatedScore = Math.min(100, Math.round(weightedSum * 10) / 10)
  } else {
    let sum = 0
    allCriteria.forEach((c: any) => {
      if (scores[c.id] !== undefined && !isNaN(scores[c.id])) {
        sum += scores[c.id]
        filledCriteriaCount++
      }
    })
    calculatedScore = filledCriteriaCount > 0 ? Math.round((sum / filledCriteriaCount) * 10) / 10 : 0
  }

  // Parse health history if stored as JSON or string
  let diseaseHistoryParsed: any = null
  if (applicant.disease_history) {
    try {
      diseaseHistoryParsed =
        typeof applicant.disease_history === 'string'
          ? JSON.parse(applicant.disease_history)
          : applicant.disease_history
    } catch {
      diseaseHistoryParsed = null
    }
  }

  // Pas foto document if available
  const photoDoc = (applicant.documents || []).find(
    (d: any) =>
      (d.doc_type || d.document_type || d.original_name || '').toLowerCase().includes('foto') ||
      (d.mime_type || '').startsWith('image/')
  )

  const isCompleted = session.status_color === 'green'

  return (
    <div className="-m-3.5 sm:-m-4 md:-m-6 lg:-m-8 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-3.6rem)] lg:max-h-[calc(100vh-3.6rem)] lg:overflow-hidden bg-background animate-fade-in select-text">
      {/* ── Mobile/Tablet View Switcher (< lg) ── */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 rounded-xl m-3 sm:m-4 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('rubric')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all",
            mobileTab === 'rubric'
              ? "bg-white text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>Lembar Rubrik ({filledCriteriaCount}/{allCriteria.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('dossier')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all",
            mobileTab === 'dossier'
              ? "bg-white text-emerald-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Identitas {applicant.full_name?.split(' ')[0] || 'Santri'}</span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          KOLOM KIRI: LEMBAR PENILAIAN SESUAI RUBRIK (FULL WORKSPACE)
          Scroll mandiri tanpa scrollbar ganda, textarea & catatan tidak terpotong
          ════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "flex-1 flex flex-col h-full min-h-0 min-w-0 bg-white overflow-hidden",
          mobileTab !== 'rubric' && "hidden lg:flex"
        )}
      >
        {/* ── Header Lembar Penilaian (Sticky di atas kolom kiri) ── */}
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shrink-0 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Navigasi & Metadata Sesi */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl shrink-0"
                  onClick={() => navigate(`/admin/sessions/${isTahfidz ? 'tahfidz' : 'wawancara'}`)}
                  title="Kembali ke Daftar Sesi"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs font-semibold">Kembali</span>
                </Button>
                <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
                  Lembar {sessionLabel}
                </h1>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0",
                    isCompleted
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                      : "bg-amber-50 text-amber-800 border-amber-200/80"
                  )}
                >
                  {isCompleted ? 'Selesai' : 'Menunggu'}
                </span>
              </div>

              {/* Baris Informasi Sesi */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pl-0 sm:pl-1">
                <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-none">
                  {session.name}
                </span>
                <span className="text-slate-300 select-none">·</span>
                <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {session.session_date
                    ? new Date(session.session_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '-'}
                </span>
                <span className="text-slate-300 select-none">·</span>
                <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {session.start_time || '-'}
                </span>
                {session.officer_name && (
                  <>
                    <span className="text-slate-300 select-none">·</span>
                    <span className="flex items-center gap-1 shrink-0 font-medium text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {session.officer_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Skor Akhir dan Tombol Simpan */}
            <div className="flex items-center gap-3 sm:gap-4 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  SKOR AKHIR
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight leading-none">
                  {calculatedScore.toLocaleString('id-ID', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-98 shrink-0"
              >
                <Save className="h-4 w-4 shrink-0" />
                <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Area Konten Rubrik (Scroll Mandiri tanpa batasan kaku, scrollbar tersembunyi) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden no-scrollbar pb-24 sm:pb-32">
          {/* Status Kelengkapan Pengisian */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900">
                Kriteria Penilaian {sessionLabel}
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {filledCriteriaCount} / {allCriteria.length} Kriteria Terisi
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-2xl bg-slate-50 text-slate-500 text-sm">
              Belum ada kriteria rubrik yang dikonfigurasi untuk kategori {sessionLabel}.
              <div className="mt-2">
                <Link to="/admin/rubrik" className="text-emerald-600 font-semibold hover:underline text-xs">
                  Atur Rubrik di Menu Rubrik &rarr;
                </Link>
              </div>
            </div>
          ) : (
            categories.map((cat: any) => (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {cat.name}
                  </h3>
                </div>

                {/* Satu Baris per Rubrik (Single-Row Pattern) */}
                <div className="space-y-2.5">
                  {(cat.criteria || []).map((cr: any) => {
                    const currentVal = scores[cr.id] ?? ''
                    return (
                      <div
                        key={cr.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-2xs transition-all"
                      >
                        {/* Kolom Kiri: Nama & Bobot */}
                        <div className="min-w-0 flex-1">
                          <label className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                            {cr.name}
                          </label>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {cr.weight > 0 ? (
                              <span className="font-semibold text-slate-700">
                                Bobot {cr.weight}%
                              </span>
                            ) : (
                              <span>Standar</span>
                            )}
                            {cr.description && (
                              <>
                                <span className="text-slate-300 select-none">·</span>
                                <span className="truncate max-w-[200px] sm:max-w-md text-slate-500">
                                  {cr.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Kolom Kanan: Rekomendasi Chip + Input & /100 Sejajar Sempurna */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Rekomendasi Cepat Nilai */}
                          <div className="hidden sm:flex items-center gap-1 mr-1">
                            {[75, 85, 95].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setScores((prev) => ({ ...prev, [cr.id]: preset }))}
                                className={cn(
                                  "h-7 px-2 text-[10px] font-semibold rounded-md border transition-all active:scale-95",
                                  currentVal === preset
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                                )}
                                title={`Pilih nilai ${preset}`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          {/* Unified Input Group: Input & /100 Locked Vertically Inline */}
                          <div className="flex items-center h-9 rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden shadow-2xs">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              value={currentVal}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ''
                                    ? ''
                                    : Math.min(100, Math.max(0, Number(e.target.value)))
                                setScores((prev) => ({
                                  ...prev,
                                  [cr.id]: val === '' ? (undefined as any) : Number(val),
                                }))
                              }}
                              className="h-full w-14 sm:w-16 px-2 text-sm font-bold text-center text-slate-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none leading-none"
                            />
                            <div className="h-full flex items-center justify-center px-2.5 bg-slate-50 border-l border-slate-200 text-xs font-bold text-slate-500 select-none leading-none">
                              / 100
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Catatan Khusus Penguji (Full Width, tidak terpotong) */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-600" />
                Catatan Khusus Penguji (Opsional)
              </label>
              <span className="text-[11px] text-muted-foreground">Tersimpan otomatis bersama skor</span>
            </div>
            <Textarea
              rows={4}
              placeholder="Tuliskan catatan evaluasi, kekuatan santri, rekomendasi pembinaan, atau poin penting lainnya..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 leading-relaxed p-3.5"
            />
          </div>

          {/* Rangkuman Skor Bawah */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-bold block">
                Total {isWeighted ? 'Terbobot' : 'Rata-Rata'}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {filledCriteriaCount} dari {allCriteria.length} Kriteria Terisi
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-800 leading-tight">
                {calculatedScore.toLocaleString('id-ID', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">Skala 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          KOLOM KANAN: IDENTITAS CALON SANTRI (Nempel Pojok Kanan seperti Panduan TIU,
          scroll mandiri tanpa scrollbar, tanpa Riwayat Nilai)
          ════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "w-full lg:w-[380px] xl:w-[440px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-slate-50/50 p-4 sm:p-6 flex flex-col h-full min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden no-scrollbar pb-24 sm:pb-32",
          mobileTab !== 'dossier' && "hidden lg:flex"
        )}
      >
        {/* Header Identitas (Simple, no card container — persis seperti Panduan TIU) */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800">Identitas Calon Santri</h3>
              <p className="text-[11px] text-muted-foreground">Biodata lengkap dari formulir pendaftaran</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize font-semibold bg-white text-emerald-800 border-emerald-200 shrink-0">
            Jalur {applicant.registration_path || 'Reguler'}
          </Badge>
        </div>

        {/* ── 1. Biodata Santri ── */}
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            {photoDoc ? (
              <img
                src={photoDoc.public_url || `/api/ppdb/documents/${photoDoc.id}/download`}
                alt={applicant.full_name}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover border-2 border-emerald-500/80 shadow-xs shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs shrink-0">
                {(applicant.full_name || 'A')[0]}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                  {applicant.full_name}
                </h3>
                <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                  {applicant.gender === 'female' || applicant.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>No. Reg: <strong className="font-mono text-slate-800">{applicant.registration_number || '-'}</strong></span>
                <span>•</span>
                <span>NISN: <strong className="text-slate-800">{applicant.nisn || '-'}</strong></span>
                <span>•</span>
                <span>NIK: <strong className="text-slate-800">{applicant.nik || '-'}</strong></span>
              </p>
              <p className="text-xs text-slate-600 truncate flex items-center gap-1.5 pt-0.5">
                <School className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Asal Sekolah: <strong className="text-slate-800">{applicant.previous_school || '-'}</strong></span>
              </p>
            </div>
          </div>

          {/* Kontak & Domisili Singkat */}
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 min-w-0">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate text-slate-700">{applicant.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/80 min-w-0">
                <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {applicant.phone ? (
                  <a
                    href={`https://wa.me/${applicant.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-emerald-700 hover:underline font-medium"
                  >
                    {applicant.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Home className="h-3 w-3" /> Alamat Domisili
              </span>
              <p className="text-slate-800 leading-relaxed font-medium">
                {applicant.address || '-'}
              </p>
              <p className="text-[11px] text-slate-500">
                {[
                  applicant.village && `Kel. ${applicant.village}`,
                  applicant.district && `Kec. ${applicant.district}`,
                  applicant.city,
                  applicant.province,
                  applicant.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-200/70 my-5" />

        {/* ── 2. Data Orang Tua & Wali ── */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            Data Orang Tua & Wali Calon Santri
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Data Ayah */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Ayah Kandung</span>
              <p className="font-bold text-slate-900 truncate">{applicant.father_name || '-'}</p>
              <p className="text-slate-600 truncate">Pekerjaan: {applicant.father_job || '-'}</p>
              <p className="text-slate-600 flex items-center gap-1 mt-1 truncate">
                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                {applicant.father_phone || '-'}
              </p>
            </div>

            {/* Data Ibu */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Ibu Kandung</span>
              <p className="font-bold text-slate-900 truncate">{applicant.mother_name || '-'}</p>
              <p className="text-slate-600 truncate">Pekerjaan: {applicant.mother_job || '-'}</p>
              <p className="text-slate-600 flex items-center gap-1 mt-1 truncate">
                <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                {applicant.mother_phone || '-'}
              </p>
            </div>

            {/* Wali jika ada */}
            {applicant.guardian_name && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Wali Santri</span>
                <p className="font-bold text-slate-900 truncate">{applicant.guardian_name}</p>
                <p className="text-slate-600 truncate">Pekerjaan: {applicant.guardian_job || '-'}</p>
              </div>
            )}

            {/* Info Finansial & Email Orang Tua */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-1 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Email Orang Tua</span>
                <span className="text-slate-800 truncate block">{applicant.parent_email || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Penghasilan Bulanan</span>
                <span className="text-slate-800 font-semibold">{applicant.parent_income || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-200/70 my-5" />

        {/* ── 3. Profil Kesehatan Santri (10 Item Baku) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
              Profil Kesehatan Santri
            </h4>
            <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-200 bg-rose-50">
              Sensitif
            </Badge>
          </div>

          {diseaseHistoryParsed ? (
            <div className="space-y-2 text-xs">
              {/* Item 1: Penyakit kronis */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">1. Riwayat Penyakit Kronis</span>
                  {diseaseHistoryParsed.chronic_disease_detail && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.chronic_disease_detail}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.has_chronic_disease ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.has_chronic_disease ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 2: Kondisi terdiagnosis */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-1">
                <span className="font-semibold text-slate-800 block">2. Kondisi yang Pernah Didiagnosis</span>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(diseaseHistoryParsed.diagnosed_conditions) && diseaseHistoryParsed.diagnosed_conditions.length > 0 ? (
                    diseaseHistoryParsed.diagnosed_conditions.map((cond: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-[10px] bg-slate-50 text-rose-700 border-rose-200">
                        {cond}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px]">Tidak ada kondisi spesifik</span>
                  )}
                </div>
              </div>

              {/* Item 3: Alergi */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">3. Alergi Makanan / Obat</span>
                  {diseaseHistoryParsed.allergy_details && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.allergy_details}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.has_allergy ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.has_allergy ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 4: Pengobatan rutin */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">4. Pengobatan Rutin / Berkala</span>
                  {diseaseHistoryParsed.medication_details && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.medication_details}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.regular_medication ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.regular_medication ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 5: Keterbatasan fisik */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">5. Keterbatasan Fisik</span>
                  {diseaseHistoryParsed.physical_limitation_details && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.physical_limitation_details}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.physical_limitation ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.physical_limitation ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 6: Rawat inap */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">6. Rawat Inap / Operasi (2 Thn Terakhir)</span>
                  {diseaseHistoryParsed.hospitalization_details && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.hospitalization_details}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.hospitalized_recently ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.hospitalized_recently ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 7: Kebutuhan khusus */}
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block">7. Kebutuhan Khusus Saat Belajar</span>
                  {diseaseHistoryParsed.special_needs_details && (
                    <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.special_needs_details}</p>
                  )}
                </div>
                <Badge variant={diseaseHistoryParsed.special_needs ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                  {diseaseHistoryParsed.special_needs ? 'Ya' : 'Tidak'}
                </Badge>
              </div>

              {/* Item 8, 9, 10: Kontak darurat */}
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                <span className="font-bold text-amber-900 block">Kontak Darurat Kesehatan</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-amber-800">
                  <span>Nama: <strong>{diseaseHistoryParsed.emergency_contact_name || '-'}</strong></span>
                  <span>Hubungan: <strong>{diseaseHistoryParsed.emergency_contact_relation || '-'}</strong></span>
                  <span className="flex items-center gap-1 font-bold">
                    <Phone className="h-3 w-3" />
                    {diseaseHistoryParsed.emergency_contact_phone || '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Data profil kesehatan calon santri belum diisi atau tidak tersedia.
            </p>
          )}
        </div>

        <div className="h-px bg-slate-200/70 my-5" />

        {/* ── 4. Berkas Pendaftaran & Status Kelengkapan ── */}
        <div className="space-y-3 pb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            Berkas Pendaftaran & Kelengkapan
          </h4>
          {applicant.documents && applicant.documents.length > 0 ? (
            <div className="space-y-2 text-xs">
              {applicant.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 truncate capitalize">
                      {doc.doc_type || doc.document_type || 'Berkas'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {doc.original_name || doc.file_name || 'Lihat Berkas'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 shrink-0 bg-white hover:bg-slate-100"
                    onClick={() => {
                      const url = doc.public_url || `/api/ppdb/documents/${doc.id}/download`
                      window.open(url, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3 w-3" /> Buka
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Belum ada dokumen yang diunggah oleh calon santri.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
