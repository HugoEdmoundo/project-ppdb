import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/client'
import { useToast } from '@/components/Toast'
import {
  Button,
  Badge,
  Input,
  Textarea,
} from '@/components/ui'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  Users,
  Award,
  HeartPulse,
  FileText,
  Save,
  ExternalLink,
  Phone,
  Mail,
  Home,
  AlertCircle,
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

  // Initialize scores and notes when data arrives
  useEffect(() => {
    if (data) {
      if (data.existing_scores) {
        setScores(data.existing_scores)
      }
      if (data.evaluator_notes) {
        setNotes(data.evaluator_notes)
      }
    }
  }, [data])

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

      return await api.apiFetch('/selection/results', {
        method: 'POST',
        body: JSON.stringify({
          applicant_id: data.applicant.id,
          scores: scoreItems,
          notes: notes.trim() || undefined,
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
      <div className="flex h-[70vh] items-center justify-center">
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
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500" />
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

  const { session, applicant, categories, tiu_score, tahfidz_scores } = data

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
      diseaseHistoryParsed = typeof applicant.disease_history === 'string'
        ? JSON.parse(applicant.disease_history)
        : applicant.disease_history
    } catch {
      diseaseHistoryParsed = null
    }
  }

  // Pas foto document if available
  const photoDoc = (applicant.documents || []).find((d: any) =>
    (d.doc_type || d.document_type || d.original_name || '').toLowerCase().includes('foto') ||
    (d.mime_type || '').startsWith('image/')
  )

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] overflow-hidden animate-fade-in -mt-2">
      {/* ── Top Bar / Action Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b shrink-0 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-slate-600 hover:text-slate-900"
            onClick={() => navigate(`/admin/sessions/${isTahfidz ? 'tahfidz' : 'wawancara'}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali
          </Button>
          <div className="h-4 w-px bg-slate-300" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Lembar Input Penilaian {sessionLabel}
              </h1>
              <Badge
                variant={session.status_color === 'green' ? 'success' : 'warning'}
                className="text-[10px] uppercase font-bold"
              >
                {session.status_color === 'green' ? 'Selesai Dinilai' : 'Menunggu Penilaian'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-slate-700">{session.name}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {session.session_date ? new Date(session.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {session.start_time || '-'} – Selesai WIB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <User className="h-3 w-3" />
                {session.officer_name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Skor Akhir</span>
            <span className="text-base font-black text-emerald-700">{calculatedScore} / 100</span>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Penilaian'}
          </Button>
        </div>
      </div>

      {/* ── 2-Column Split Screen (Independent Scroll Containers) ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden pt-4 min-h-0">
        {/* ════════════════════════════════════════════════════════════
            KOLOM KIRI: LEMBAR PENILAIAN SESUAI RUBRIK
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-xs">
          <div className="px-5 py-3.5 border-b bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Rubrik Penilaian {sessionLabel}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filledCriteriaCount} dari {allCriteria.length} Kriteria Terisi
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {categories.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl bg-slate-50 text-slate-500 text-sm">
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
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {cat.name}
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {(cat.criteria || []).map((cr: any) => {
                      const currentVal = scores[cr.id] ?? ''
                      return (
                        <div
                          key={cr.id}
                          className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-emerald-300 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-800 block">
                                {cr.name}
                              </label>
                              {cr.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                  {cr.description}
                                </p>
                              )}
                            </div>
                            {cr.weight > 0 && (
                              <Badge variant="outline" className="text-[10px] font-semibold shrink-0 bg-white">
                                Bobot {cr.weight}%
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <div className="relative flex-1 max-w-[140px]">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0 - 100"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value)))
                                  setScores((prev) => ({
                                    ...prev,
                                    [cr.id]: val === '' ? (undefined as any) : Number(val),
                                  }))
                                }}
                                className="h-9 text-sm font-semibold text-right pr-3"
                              />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">/ 100</span>

                            {/* Preset Quick Buttons */}
                            <div className="flex items-center gap-1 ml-auto">
                              {[70, 80, 85, 90, 95].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setScores((prev) => ({ ...prev, [cr.id]: preset }))}
                                  className={cn(
                                    "px-2 py-1 text-[10px] font-semibold rounded-md border transition-all",
                                    currentVal === preset
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                  )}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Catatan Penguji */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-600" />
                Catatan Khusus Penguji (Opsional)
              </label>
              <Textarea
                rows={3}
                placeholder="Tuliskan catatan evaluasi, kekuatan santri, rekomendasi, atau hal penting yang perlu diperhatikan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Footer Skor Rangkuman */}
          <div className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-bold block">
                Total Perhitungan {isWeighted ? 'Terbobot' : 'Rata-Rata'}
              </span>
              <span className="text-xs text-slate-600">
                {filledCriteriaCount} Kriteria terisi dari {allCriteria.length}
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-700">{calculatedScore}</div>
              <span className="text-[10px] text-slate-500 font-semibold block">Skala 100</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            KOLOM KANAN: DATA LENGKAP CALON SANTRI DARI FORMULIR
            (SCROLLABLE CONTAINER, HALAMAN TETAP TERKUNCI)
            ════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden border border-slate-200 bg-slate-50/50 rounded-2xl shadow-xs">
          <div className="px-5 py-3.5 border-b bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Berkas & Biodata Lengkap Calon Santri
              </h2>
            </div>
            <Badge variant="outline" className="text-xs capitalize font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
              Jalur {applicant.registration_path || 'Reguler'}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Header Santri Card */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-4 shadow-2xs">
              {photoDoc ? (
                <img
                  src={photoDoc.public_url || `/api/ppdb/documents/${photoDoc.id}/download`}
                  alt={applicant.full_name}
                  className="h-16 w-16 rounded-xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                  onError={(e) => {
                    // Fallback to avatar if failed
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                  {(applicant.full_name || 'A')[0]}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 truncate">
                    {applicant.full_name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {applicant.gender === 'female' || applicant.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>NISN: <strong className="text-slate-800">{applicant.nisn || '-'}</strong></span>
                  <span>•</span>
                  <span>NIK: <strong className="text-slate-800">{applicant.nik || '-'}</strong></span>
                </p>
                <p className="text-xs text-slate-600">
                  Asal Sekolah: <strong className="text-slate-800">{applicant.previous_school || '-'}</strong>
                </p>
              </div>
            </div>

            {/* Nilai Pendukung: TIU atau Tahfidz Sebelumnya */}
            {(tiu_score !== null && tiu_score !== undefined || (tahfidz_scores && tahfidz_scores.length > 0)) && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-emerald-600" />
                  Riwayat Nilai Tes Terkait
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tiu_score !== null && tiu_score !== undefined && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase block">Skor Ujian TIU</span>
                        <span className="text-xs text-indigo-900 font-medium">Safe Exam Browser</span>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-sm px-2.5 py-0.5">
                        {tiu_score}
                      </Badge>
                    </div>
                  )}

                  {tahfidz_scores && tahfidz_scores.length > 0 && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg col-span-full space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        Nilai Ujian Tahfidz (Telah Direkam)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {tahfidz_scores.map((ts: any, i: number) => (
                          <div key={i} className="flex justify-between bg-white/80 p-1.5 rounded border border-emerald-100">
                            <span className="text-slate-700 font-medium truncate">{ts.criteria_name}</span>
                            <strong className="text-emerald-700 ml-2">{ts.score}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Orang Tua & Wali Lengkap */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                Data Orang Tua & Wali Calon Santri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Data Ayah */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ayah Kandung</span>
                  <p className="font-bold text-slate-900">{applicant.father_name || '-'}</p>
                  <p className="text-slate-600">Pekerjaan: {applicant.father_job || '-'}</p>
                  <p className="text-slate-600 flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    {applicant.father_phone || '-'}
                  </p>
                </div>

                {/* Data Ibu */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ibu Kandung</span>
                  <p className="font-bold text-slate-900">{applicant.mother_name || '-'}</p>
                  <p className="text-slate-600">Pekerjaan: {applicant.mother_job || '-'}</p>
                  <p className="text-slate-600 flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    {applicant.mother_phone || '-'}
                  </p>
                </div>

                {/* Wali jika ada */}
                {applicant.guardian_name && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Wali Santri</span>
                    <p className="font-bold text-slate-900">{applicant.guardian_name}</p>
                    <p className="text-slate-600">Pekerjaan: {applicant.guardian_job || '-'}</p>
                  </div>
                )}

                {/* Info Finansial & Email */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2 flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Email Orang Tua</span>
                    <span className="text-slate-800">{applicant.parent_email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Penghasilan Bulanan</span>
                    <span className="text-slate-800 font-semibold">{applicant.parent_income || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kontak & Domisili Lengkap */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-indigo-600" />
                Kontak & Domisili Santri
              </h4>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-slate-50">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{applicant.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-slate-50">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{applicant.phone || '-'}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Alamat Tinggal</span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {applicant.address || '-'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {[
                      applicant.village && `Kel. ${applicant.village}`,
                      applicant.district && `Kec. ${applicant.district}`,
                      applicant.city,
                      applicant.province,
                      applicant.postal_code,
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Formulir Identifikasi Kesehatan (10 Item Lengkap) */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                  Formulir Profil Kesehatan Santri
                </h4>
                <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-200 bg-rose-50">
                  Sensitif
                </Badge>
              </div>

              {diseaseHistoryParsed ? (
                <div className="space-y-2.5 text-xs">
                  {/* Item 1: Penyakit kronis */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">1. Riwayat Penyakit Kronis</span>
                      {diseaseHistoryParsed.chronic_disease_detail && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.chronic_disease_detail}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.has_chronic_disease ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.has_chronic_disease ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 2: Diagnosis */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-800 block">2. Kondisi yang Pernah Didiagnosis</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.isArray(diseaseHistoryParsed.diagnosed_conditions) && diseaseHistoryParsed.diagnosed_conditions.length > 0 ? (
                        diseaseHistoryParsed.diagnosed_conditions.map((cond: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[10px] bg-white text-rose-700 border-rose-200">
                            {cond}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-slate-500 text-[11px]">Tidak ada kondisi spesifik</span>
                      )}
                    </div>
                  </div>

                  {/* Item 3: Alergi */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">3. Alergi Makanan/Obat/Lainnya</span>
                      {diseaseHistoryParsed.allergy_details && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.allergy_details}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.has_allergy ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.has_allergy ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 4: Obat Rutin */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">4. Pengobatan Rutin / Berkala</span>
                      {diseaseHistoryParsed.medication_details && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.medication_details}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.regular_medication ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.regular_medication ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 5: Keterbatasan Fisik */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">5. Keterbatasan Fisik</span>
                      {diseaseHistoryParsed.physical_limitation_details && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.physical_limitation_details}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.physical_limitation ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.physical_limitation ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 6: Rawat Inap / Operasi */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">6. Rawat Inap / Operasi (2 Thn Terakhir)</span>
                      {diseaseHistoryParsed.hospitalization_details && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.hospitalization_details}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.hospitalized_recently ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.hospitalized_recently ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 7: Kebutuhan Khusus Saat Belajar */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">7. Kebutuhan Khusus Saat Belajar</span>
                      {diseaseHistoryParsed.special_needs_details && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{diseaseHistoryParsed.special_needs_details}</p>
                      )}
                    </div>
                    <Badge variant={diseaseHistoryParsed.special_needs ? 'destructive' : 'secondary'} className="text-[10px]">
                      {diseaseHistoryParsed.special_needs ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>

                  {/* Item 8, 9, 10: Kontak Darurat */}
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                    <span className="font-bold text-amber-900 block">Kontak Darurat Kesehatan</span>
                    <div className="flex flex-wrap items-center gap-3 text-amber-800">
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

            {/* Dokumen Persyaratan yang Diunggah */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                Dokumen Persyaratan yang Diunggah
              </h4>
              {applicant.documents && applicant.documents.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {applicant.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all"
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
                        className="h-7 text-xs gap-1 shrink-0 bg-white"
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
                  Belum ada dokumen yang diunggah oleh pendaftar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
