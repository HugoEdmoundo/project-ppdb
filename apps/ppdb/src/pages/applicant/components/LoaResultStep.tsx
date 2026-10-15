import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ApplicantLoAModal from '@/components/shared/ApplicantLoAModal'
import {
  CheckCircle,
  X,
  FileSignature,
  AlertTriangle,
  ShieldCheck,
  PenTool,
  ArrowRight,
  Sparkles,
  Brain,
  BookOpen,
  MessageSquare,
  Award,
  Calculator,
  Info,
} from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'

interface CriterionItem {
  criteria_name: string
  weight: number
  score: number
  weighted_score?: number
}

interface CategoryGroup {
  category_name: string
  total_weight: number
  subtotal_score: number
  criteria: CriterionItem[]
}

interface LoaResultStepProps {
  applicant: any
  selectionResult: any
  loa?: any
}

export default function LoaResultStep({ applicant, selectionResult, loa }: LoaResultStepProps) {
  const navigate = useNavigate()
  const [showLoaModal, setShowLoaModal] = useState(false)

  const isLoaSigned = Boolean(loa?.is_loa_signed || applicant?.is_loa_signed)

  // Parse & structure categories, weights, and scores cleanly
  const { tiuScore, totalScore, tahfidzCategory, wawancaraCategory, otherCategories } = useMemo(() => {
    let catList: CategoryGroup[] = []

    if (selectionResult?.categories && Array.isArray(selectionResult.categories) && selectionResult.categories.length > 0) {
      catList = selectionResult.categories.map((cat: any) => {
        const critList: CriterionItem[] = (cat.criteria || []).map((cr: any) => {
          const w = Number(cr.weight || 0)
          const sc = Number(cr.score || 0)
          const weighted = cr.weighted_score !== undefined
            ? Number(cr.weighted_score)
            : w > 0 ? Number(((sc * w) / 100).toFixed(2)) : sc
          return {
            criteria_name: cr.criteria_name,
            weight: w,
            score: sc,
            weighted_score: weighted,
          }
        })
        const totWeight = critList.reduce((acc, c) => acc + c.weight, 0)
        let subtotal = cat.subtotal_score !== undefined ? Number(cat.subtotal_score) : 0
        if (cat.subtotal_score === undefined && critList.length > 0) {
          subtotal = totWeight > 0
            ? Number(critList.reduce((acc, c) => acc + (c.weighted_score || 0), 0).toFixed(2))
            : Number((critList.reduce((acc, c) => acc + c.score, 0) / critList.length).toFixed(2))
        }
        return {
          category_name: cat.category_name,
          total_weight: totWeight,
          subtotal_score: subtotal,
          criteria: critList,
        }
      })
    } else if (selectionResult?.scores && Array.isArray(selectionResult.scores) && selectionResult.scores.length > 0) {
      // Fallback: group flat scores by category_name
      const grouped: Record<string, CriterionItem[]> = {}
      selectionResult.scores.forEach((sc: any) => {
        const cat = sc.category_name || 'Lainnya'
        if (!grouped[cat]) grouped[cat] = []
        const w = Number(sc.weight || 0)
        const s = Number(sc.score || 0)
        grouped[cat].push({
          criteria_name: sc.criteria_name,
          weight: w,
          score: s,
          weighted_score: w > 0 ? Number(((s * w) / 100).toFixed(2)) : s,
        })
      })

      catList = Object.entries(grouped).map(([catName, critList]) => {
        const totWeight = critList.reduce((acc, c) => acc + c.weight, 0)
        const subtotal = totWeight > 0
          ? Number(critList.reduce((acc, c) => acc + (c.weighted_score || 0), 0).toFixed(2))
          : Number((critList.reduce((acc, c) => acc + c.score, 0) / critList.length).toFixed(2))
        return {
          category_name: catName,
          total_weight: totWeight,
          subtotal_score: subtotal,
          criteria: critList,
        }
      })
    }

    // Separate TIU from categories if it was stored as a rubric category
    const tiuCat = catList.find(c => (c.category_name || '').toLowerCase().includes('tiu'))
    const cleanCategories = catList.filter(c => c !== tiuCat)

    // Dedicated categories
    const tahfidz = cleanCategories.find(c => (c.category_name || '').toLowerCase().includes('tahfidz')) || null
    const wawancara = cleanCategories.find(c => {
      const n = (c.category_name || '').toLowerCase()
      return n.includes('wawancara') || n.includes('interview')
    }) || null
    const others = cleanCategories.filter(c => c !== tahfidz && c !== wawancara)

    // TIU Score
    const rawTiu = selectionResult?.tiu_score ?? tiuCat?.subtotal_score ?? tiuCat?.criteria?.[0]?.score ?? null
    const parsedTiu = rawTiu != null ? Number(rawTiu) : null

    // Final total score
    let finalTotal: number | null = null
    if (selectionResult?.total_score != null) {
      finalTotal = Number(selectionResult.total_score)
    } else {
      const components: number[] = []
      cleanCategories.forEach(c => {
        if (c.subtotal_score != null && !isNaN(c.subtotal_score)) {
          components.push(c.subtotal_score)
        }
      })
      if (parsedTiu != null && !isNaN(parsedTiu)) {
        components.push(parsedTiu)
      }
      if (components.length > 0) {
        finalTotal = Number((components.reduce((acc, val) => acc + val, 0) / components.length).toFixed(2))
      }
    }

    return {
      categories: cleanCategories,
      tiuScore: parsedTiu,
      totalScore: finalTotal,
      tahfidzCategory: tahfidz,
      wawancaraCategory: wawancara,
      otherCategories: others,
    }
  }, [selectionResult])

  if (applicant?.status === 'failed') {
    return (
      <div className="p-6 sm:p-8 border rounded-2xl text-center bg-red-50/70 border-red-200">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-red-800 mb-2 font-heading">Mohon Maaf, Anda Dinyatakan Tidak Lulus</h3>
        <p className="text-red-700 text-sm max-w-md mx-auto leading-relaxed">
          Terima kasih telah berpartisipasi dalam proses seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Tetap semangat dalam menuntut ilmu di mana pun Anda berada.
        </p>
      </div>
    )
  }

  if (applicant?.status !== 'passed') {
    return (
      <div className="p-6 sm:p-8 border rounded-2xl text-center bg-muted/10">
        <p className="text-muted-foreground text-sm">Belum ada pengumuman hasil seleksi. Silakan cek kembali nanti.</p>
      </div>
    )
  }

  const regPath = (applicant?.registration_path || '').toLowerCase()
  const isTiuPath = ['reguler', 'tiu', 'tes', 'reguler_tiu'].includes(regPath) || regPath.includes('tiu')

  // Predikat badge calculation based on total score
  const getPredicateBadge = (score: number) => {
    if (score >= 90) return { label: 'Sangat Baik (Mumtaz)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    if (score >= 80) return { label: 'Baik (Jayyid Jiddan)', cls: 'bg-teal-100 text-teal-800 border-teal-300' }
    if (score >= 70) return { label: 'Cukup (Jayyid)', cls: 'bg-blue-100 text-blue-800 border-blue-300' }
    return { label: 'Lulus Bersyarat', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Kelulusan */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-12 h-12 shrink-0 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pengumuman Resmi Seleksi
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 font-heading mt-1">
                Selamat! Anda Dinyatakan LULUS Seleksi Santri Baru
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl">
                Alhamdulillah, ananda <strong>{applicant?.full_name || 'Calon Santri'}</strong> telah menyelesaikan seluruh tahapan seleksi PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman dan memenuhi kriteria kelulusan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KARTU REKAPITULASI NILAI AKHIR (TOTAL SKOR TERBOBOT & TRANSPARANSI) */}
      <div className="border-2 border-emerald-300/80 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-4 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-accent shrink-0" />
              <h4 className="font-bold text-base sm:text-lg font-heading text-white">
                Rekapitulasi Nilai Akhir & Hasil Evaluasi
              </h4>
            </div>
            <p className="text-xs text-emerald-100 max-w-md">
              Akumulasi murni perolehan nilai berdasarkan bobot persentase (%) setiap rubrik penilaian yang ditetapkan panitia penguji.
            </p>
          </div>

          {totalScore !== null && (
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-3 sm:p-4 text-center md:text-right shrink-0">
              <span className="text-[11px] uppercase font-semibold text-emerald-100 block tracking-wider">
                Skor Akhir Kelulusan
              </span>
              <div className="flex items-baseline justify-center md:justify-end gap-1.5 mt-0.5">
                <span className="text-3xl sm:text-4xl font-extrabold font-heading text-white">
                  {totalScore}
                </span>
                <span className="text-xs font-medium text-emerald-200">/ 100</span>
              </div>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPredicateBadge(totalScore).cls}`}>
                  {getPredicateBadge(totalScore).label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ringkasan Subtotal Per Komponen Evaluasi */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Komponen TIU */}
          {(isTiuPath || tiuScore !== null) && (
            <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-900 font-semibold flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-blue-600" />
                  Tes TIU Online
                </span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  Ujian SEB
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-heading text-blue-700">
                  {tiuScore !== null ? tiuScore : '—'}
                </span>
                <span className="text-xs text-slate-400">Skala 100</span>
              </div>
            </div>
          )}

          {/* Komponen Tahfidz */}
          <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-950 font-semibold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Uji Tahfidz
              </span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Rubrik Terbobot
              </Badge>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-heading text-emerald-700">
                {tahfidzCategory?.subtotal_score !== undefined ? tahfidzCategory.subtotal_score : '—'}
              </span>
              <span className="text-xs text-slate-400">Skala 100</span>
            </div>
          </div>

          {/* Komponen Wawancara */}
          <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-950 font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                Uji Wawancara
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Rubrik Terbobot
              </Badge>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-heading text-amber-700">
                {wawancaraCategory?.subtotal_score !== undefined ? wawancaraCategory.subtotal_score : '—'}
              </span>
              <span className="text-xs text-slate-400">Skala 100</span>
            </div>
          </div>
        </div>

        {/* Callout Transparansi Perhitungan */}
        <div className="p-3.5 sm:p-4 bg-emerald-50/50 flex items-start gap-3 text-xs text-emerald-900 border-b border-emerald-100">
          <Calculator className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Transparansi Penilaian:</strong> Setiap kriteria rubrik dikalikan dengan bobot persentase masing-masing (<strong>Nilai Terbobot = Skor × Bobot %</strong>) sehingga total akhir merupakan hasil evaluasi murni dan terukur tanpa pembulatan acak.
          </p>
        </div>
      </div>

      {/* 3. RINCIAN NILAI TERPISAH SESUAI INPUT RUBRIK & KATEGORI */}

      {/* SEKSI A: TES TIU ONLINE */}
      {(isTiuPath || tiuScore !== null) && (
        <div className="border border-blue-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-blue-50/80 p-4 sm:p-5 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-blue-950">
                  1. Tes Inteligensi Umum (TIU) Online
                </h4>
                <p className="text-xs text-blue-700">Tes Skolastik & Akademik Mandiri via Safe Exam Browser (SEB)</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-xs">
              Skor: {tiuScore !== null ? tiuScore : '—'} / 100
            </Badge>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Metode Penilaian:</span>
                  <span className="font-semibold text-slate-800 text-xs">Pilihan Ganda Otomatis (Webhook Apps Script)</span>
                </div>
                <Badge variant="success" className="text-[10px]">Tervalidasi</Badge>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Waktu Ujian:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {selectionResult?.tiu_completed_at
                      ? new Date(selectionResult.tiu_completed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'
                      : 'Tercatat di server SEB'}
                  </span>
                </div>
                <span className="font-bold text-blue-700 text-sm">{tiuScore !== null ? `${tiuScore} Pts` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKSI B: SELEKSI TAHFIDZ AL-QUR'AN */}
      <div className="border border-emerald-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-emerald-50/80 p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                {isTiuPath || tiuScore !== null ? '2.' : '1.'} Seleksi Uji Tahfidz Al-Qur'an (1:1)
              </h4>
              <p className="text-xs text-emerald-700">Penilaian langsung penguji tahfidz bersertifikasi sesuai kriteria rubrik</p>
            </div>
          </div>
          {tahfidzCategory && (
            <Badge variant="success" className="bg-emerald-200 text-emerald-900 border-emerald-400 font-bold text-xs self-start sm:self-center">
              Subtotal Tahfidz: {tahfidzCategory.subtotal_score} / 100
            </Badge>
          )}
        </div>

        <div className="p-0 sm:p-4">
          {tahfidzCategory && tahfidzCategory.criteria && tahfidzCategory.criteria.length > 0 ? (
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full text-xs text-left min-w-[480px]">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Kriteria Penilaian Rubrik</th>
                    <th className="p-3 text-center w-28">Bobot (%)</th>
                    <th className="p-3 text-center w-32">Skor Mentah (0-100)</th>
                    <th className="p-3 text-right w-36">Nilai Terbobot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tahfidzCategory.criteria.map((cr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">
                        {cr.criteria_name}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-medium">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          {cr.weight}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 text-sm">
                        {cr.score}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        {cr.weighted_score !== undefined ? cr.weighted_score.toFixed(2) : ((cr.score * cr.weight) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50/60 border-t-2 border-emerald-200 font-bold text-slate-900">
                  <tr>
                    <td className="p-3 text-emerald-950 font-bold">Subtotal Nilai Tahfidz</td>
                    <td className="p-3 text-center text-emerald-800">{tahfidzCategory.total_weight}%</td>
                    <td className="p-3 text-center text-slate-400">—</td>
                    <td className="p-3 text-right text-emerald-800 font-mono text-base font-extrabold">
                      {tahfidzCategory.subtotal_score}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Rincian nilai tahfidz belum tersedia atau sedang disinkronisasi.
            </div>
          )}
        </div>
      </div>

      {/* SEKSI C: SELEKSI UJI WAWANCARA */}
      <div className="border border-amber-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-amber-50/80 p-4 sm:p-5 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-amber-950">
                {isTiuPath || tiuScore !== null ? '3.' : '2.'} Seleksi Uji Wawancara Santri & Wali (1:1)
              </h4>
              <p className="text-xs text-amber-800">Penilaian komitmen santri dan kesiapan orang tua/wali sesuai rubrik wawancara</p>
            </div>
          </div>
          {wawancaraCategory && (
            <Badge variant="warning" className="bg-amber-200 text-amber-900 border-amber-400 font-bold text-xs self-start sm:self-center">
              Subtotal Wawancara: {wawancaraCategory.subtotal_score} / 100
            </Badge>
          )}
        </div>

        <div className="p-0 sm:p-4">
          {wawancaraCategory && wawancaraCategory.criteria && wawancaraCategory.criteria.length > 0 ? (
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full text-xs text-left min-w-[480px]">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Kriteria Penilaian Rubrik</th>
                    <th className="p-3 text-center w-28">Bobot (%)</th>
                    <th className="p-3 text-center w-32">Skor Mentah (0-100)</th>
                    <th className="p-3 text-right w-36">Nilai Terbobot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wawancaraCategory.criteria.map((cr, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">
                        {cr.criteria_name}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-medium">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          {cr.weight}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 text-sm">
                        {cr.score}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-700 text-sm">
                        {cr.weighted_score !== undefined ? cr.weighted_score.toFixed(2) : ((cr.score * cr.weight) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-amber-50/60 border-t-2 border-amber-200 font-bold text-slate-900">
                  <tr>
                    <td className="p-3 text-amber-950 font-bold">Subtotal Nilai Wawancara</td>
                    <td className="p-3 text-center text-amber-800">{wawancaraCategory.total_weight}%</td>
                    <td className="p-3 text-center text-slate-400">—</td>
                    <td className="p-3 text-right text-amber-800 font-mono text-base font-extrabold">
                      {wawancaraCategory.subtotal_score}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Rincian nilai wawancara belum tersedia atau sedang disinkronisasi.
            </div>
          )}
        </div>
      </div>

      {/* SEKSI D: KATEGORI LAINNYA JIKA ADA */}
      {otherCategories.map((cat, cIdx) => (
        <div key={cIdx} className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-sm sm:text-base text-slate-900">{cat.category_name}</h4>
            </div>
            <Badge variant="outline" className="font-bold text-xs">
              Subtotal: {cat.subtotal_score}
            </Badge>
          </div>
          <div className="p-0 sm:p-4">
            <div className="overflow-x-auto touch-pan-x">
              <table className="w-full text-xs text-left min-w-[440px]">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Kriteria</th>
                    <th className="p-3 text-center w-28">Bobot (%)</th>
                    <th className="p-3 text-center w-32">Skor</th>
                    <th className="p-3 text-right w-36">Nilai Terbobot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cat.criteria.map((cr, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-800">{cr.criteria_name}</td>
                      <td className="p-3 text-center text-slate-600">{cr.weight}%</td>
                      <td className="p-3 text-center font-bold">{cr.score}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {cr.weighted_score !== undefined ? cr.weighted_score.toFixed(2) : ((cr.score * cr.weight) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Catatan Tim Evaluator Jika Ada */}
      {selectionResult?.notes && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600" />
            Catatan Tim Evaluator:
          </span>
          <p className="text-slate-600 italic leading-relaxed pl-5.5">
            "{selectionResult.notes}"
          </p>
        </div>
      )}

      {/* 4. LoA Section */}
      <div className="border border-emerald-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-emerald-50/70 p-4 sm:p-5 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileSignature className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-emerald-950 text-base">Dokumen Letter of Acceptance (LoA)</h4>
              <p className="text-xs text-emerald-700 truncate">Surat Resmi Penerimaan Santri Baru & Persetujuan Orang Tua/Wali</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isLoaSigned ? (
              <Badge variant="success" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Sudah Ditandatangani
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Wajib Ditandatangani
              </Badge>
            )}
            <Button
              onClick={() => setShowLoaModal(true)}
              className="w-full sm:w-auto h-9 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-semibold text-xs cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              {isLoaSigned ? 'Buka / Cetak LoA' : 'Buka & Tanda Tangani LoA'}
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {!isLoaSigned ? (
            <div className="p-4 sm:p-5 bg-amber-50/95 border-2 border-amber-300 rounded-xl text-amber-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <PenTool className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950 text-sm">
                    Konfirmasi Dua Pihak: Tanda Tangan Digital Orang Tua / Wali di Aplikasi
                  </p>
                  <p className="text-amber-900 leading-relaxed text-xs">
                    Calon santri yang dinyatakan lulus wajib melakukan konfirmasi dengan cara membubuhkan <strong>Tanda Tangan Digital Orang Tua / Wali secara langsung di aplikasi ini</strong> sebelum pembayaran Uang Muka (DP) dapat dilakukan. Tanda tangan dan nama orang tua/wali akan otomatis tercantum pada dokumen Letter of Acceptance (LoA).
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowLoaModal(true)}
                className="w-full sm:w-auto h-10 px-4 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shrink-0 shadow-xs cursor-pointer"
              >
                <PenTool className="w-4 h-4" />
                Tanda Tangani LoA di Aplikasi
              </Button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-950 text-sm">Dokumen LoA Sah dan Terverifikasi</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Tanda tangan orang tua/wali telah berhasil direkam secara digital ke dalam dokumen resmi.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoaModal(true)}
                className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 text-xs font-semibold cursor-pointer"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Pratinjau / Download LoA
              </Button>
            </div>
          )}

          <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Klausul Resmi PPDB:</p>
              <p className="mt-0.5 font-medium text-slate-800 italic">
                "Seluruh dana yang telah dibayarkan tidak dapat dikembalikan."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Next Step Action Guide */}
      {isLoaSigned ? (
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Tahap Selanjutnya Terbuka
              </span>
              <h4 className="font-bold text-slate-900 text-base sm:text-lg font-heading">
                Lanjut ke Pembayaran Uang Muka (DP) & Klaim Sertifikat SKD
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Tanda tangan LoA telah lengkap. Silakan masuk ke tahap pembayaran DP untuk mengesahkan kursi santri dan membuka dokumen resmi SKD beserta grup komunikasi sekolah.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/applicant/bayar-dp')}
            className="w-full md:w-auto h-11 px-5 gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shrink-0 cursor-pointer shadow-md hover:scale-102 transition-transform"
          >
            <span>Bayar DP & Sertifikat</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Tahap berikutnya (Bayar DP & Sertifikat) akan terbuka setelah Anda menandatangani dokumen LoA di atas.</span>
        </div>
      )}

      {/* LoA Modal */}
      <ApplicantLoAModal
        open={showLoaModal}
        onOpenChange={setShowLoaModal}
        applicantId={applicant?.id}
        isApplicantPortal={true}
      />
    </div>
  )
}
