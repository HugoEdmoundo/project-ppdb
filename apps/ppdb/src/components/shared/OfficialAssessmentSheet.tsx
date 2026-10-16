import { forwardRef, useState, useEffect } from 'react'
import { ShieldCheck, Award } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { API_BASE } from '@/api/client'

export interface OfficialAssessmentSheetProps {
  applicant: any
  categories: any[]
  tiuScore?: number | null
  tiuCompletedAt?: string | null
  evaluatorNotes?: string | null
  graduationStatus?: string | null
  logoUrl?: string | null
}

const OfficialAssessmentSheet = forwardRef<HTMLDivElement, OfficialAssessmentSheetProps>(
  (
    {
      applicant,
      categories = [],
      tiuScore,
      tiuCompletedAt,
      evaluatorNotes,
      graduationStatus,
      logoUrl: logoUrlProp,
    },
    ref
  ) => {
    // Logo resmi institusi diambil dinamis dari companyprofile settings (/companyprofile/settings/logo)
    const [logoUrl, setLogoUrl] = useState<string | null>(
      logoUrlProp || 'https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png'
    )
    const [contactInfo, setContactInfo] = useState<{
      address?: string
      email_primary?: string
      email_admission?: string
    }>({})

    useEffect(() => {
      if (logoUrlProp) {
        setLogoUrl(logoUrlProp)
      }
      // 1. Ambil Logo Institusi resmi dinamis dari settings API companyprofile (BUKAN FAVICON)
      fetch(`${API_BASE}/companyprofile/settings/logo`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.value) setLogoUrl(data.value)
        })
        .catch(() => {})

      // 2. Ambil Alamat & Email resmi dari database contact-info companyprofile
      fetch(`${API_BASE}/companyprofile/contact-info`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setContactInfo({
              address: data.address,
              email_primary: data.email_primary,
              email_admission: data.email_admission,
            })
          }
        })
        .catch(() => {})
    }, [logoUrlProp])

    const isTiuPath = ['reguler', 'umum', 'seleksi', 'tes'].some((p) =>
      (applicant?.registration_path || '').toLowerCase().includes(p)
    )

    const tahfidzCat = categories.find((c) => c.category_name?.toLowerCase().includes('tahfidz'))
    const wawancaraCat = categories.find((c) => c.category_name?.toLowerCase().includes('wawancara'))
    const otherCats = categories.filter((c) => c !== tahfidzCat && c !== wawancaraCat)

    const calculateAvg = (criteriaList?: any[]) => {
      if (!criteriaList || criteriaList.length === 0) return null
      const valid = criteriaList.filter((c) => c.score != null && !isNaN(Number(c.score)))
      if (valid.length === 0) return null
      const total = valid.reduce((acc, c) => acc + Number(c.score), 0)
      return (total / valid.length).toFixed(1)
    }

    const tahfidzAvg = calculateAvg(tahfidzCat?.criteria)
    const wawancaraAvg = calculateAvg(wawancaraCat?.criteria)

    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const statusUpper = (graduationStatus || applicant?.status || 'selection').toLowerCase()
    const isPassed = statusUpper === 'passed'
    const isFailed = statusUpper === 'failed'

    const regNo = applicant?.registration_number || applicant?.id?.slice(0, 8).toUpperCase() || 'REG-PENDARRAHMAN'
    const officialVerifyUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/loa/${regNo}?verify=official`
      : `https://ptdarrahman.sch.id/loa/${regNo}?verify=official`

    // Info kontak dari database companyprofile
    const schoolAddress =
      contactInfo.address || 'Rukan Hexa Green Kalimalang, Jl. Inspeksi Kalimalang C8-C9, Jatimulya, Tambun Selatan, Bekasi 17510'
    const schoolEmail =
      contactInfo.email_admission || contactInfo.email_primary || 'ppdb@ptdarrahman.sch.id'
    const activeDomain = typeof window !== 'undefined' ? window.location.host : 'ptdarrahman.sch.id'

    // Parsing catatan tim evaluator agar catatan Tahfidz dan Wawancara terpisah rapi atau tergabung
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

    const parsedNotes = parseNotes(evaluatorNotes)
    const hasNotes = Boolean(parsedNotes.tahfidz || parsedNotes.wawancara || parsedNotes.general)

    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          height: '297mm',
          minHeight: '297mm',
          maxHeight: '297mm',
          boxSizing: 'border-box',
          padding: '10mm 14mm 10mm 14mm',
        }}
        className="official-assessment-sheet a4-document-page bg-white text-slate-900 font-sans text-xs flex flex-col justify-between overflow-hidden selection:bg-none shadow-xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-[10mm_14mm]"
      >
        <div className="space-y-2 flex-1 flex flex-col justify-start">
          {/* ═══════════════════════════════════════════
              KOP SURAT RESMI LEMBAGA AR-RAHMAN
              Logo Dinamis dari Company Profile, Rata Tengah, Proporsional
              ═══════════════════════════════════════════ */}
          <div className="border-b-2 border-emerald-900 pb-3 mb-2">
            <div className="flex items-center justify-between gap-3">
              {/* Kolom Kiri: Logo Lembaga */}
              <div className="shrink-0 flex items-center justify-start">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Ar-Rahman"
                    className="h-[50px] w-auto max-w-[130px] object-contain shrink-0"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white flex flex-col items-center justify-center shadow-xs shrink-0">
                    <Award className="h-6 w-6 text-emerald-200" />
                    <span className="text-[7.5px] font-black uppercase mt-0.5 leading-none">PPDB</span>
                  </div>
                )}
              </div>

              {/* Kolom Tengah: Judul Kop Lembaga Rata Tengah (1 Baris Utuh) */}
              <div className="flex-1 text-center px-1">
                <h1 className="text-[13.5px] sm:text-[14px] font-black tracking-tight text-slate-900 uppercase leading-tight whitespace-nowrap">
                  PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL ARRAHMAN
                </h1>
                <p className="text-[9.5px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-wide mt-1 whitespace-nowrap">
                  PANITIA PENERIMAAN PESERTA DIDIK BARU TAHUN AJARAN 2026/2027
                </p>
              </div>

              {/* Kolom Kanan: QR Code Verifikasi Resmi */}
              <div className="shrink-0 flex items-center justify-end">
                <div className="flex flex-col items-center">
                  <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs">
                    <QRCodeSVG value={officialVerifyUrl} size={38} level="M" />
                  </div>
                  <span className="text-[7px] font-mono text-slate-400 mt-0.5">Verifikasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              JUDUL DOKUMEN & METADATA
              ═══════════════════════════════════════════ */}
          <div className="text-center pt-0.5 pb-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              LEMBAR REKAPITULASI HASIL PENILAIAN SELEKSI
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              NOMOR REGISTRASI: <strong className="text-slate-900">{regNo}</strong> &nbsp;·&nbsp; DITERBITKAN: {currentDateStr}
            </p>
          </div>

          {/* ═══════════════════════════════════════════
              BIODATA & PROFIL CALON SANTRI
              ═══════════════════════════════════════════ */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-[10.5px]">
            <table className="w-full">
              <tbody>
                <tr className="leading-normal">
                  <td className="w-32 text-slate-500 font-medium py-0.5">Nama Lengkap Santri</td>
                  <td className="w-4 text-slate-400">:</td>
                  <td className="font-bold text-slate-900 uppercase">{applicant?.full_name || '—'}</td>

                  <td className="w-32 text-slate-500 font-medium py-0.5 pl-4">Gelombang PPDB</td>
                  <td className="w-4 text-slate-400">:</td>
                  <td className="font-semibold text-slate-800">{applicant?.wave_name || 'Gelombang Aktif'}</td>
                </tr>
                <tr className="leading-normal">
                  <td className="text-slate-500 font-medium py-0.5">NISN / NIK</td>
                  <td className="text-slate-400">:</td>
                  <td className="font-semibold text-slate-800 font-mono">{applicant?.nisn || applicant?.nik || '—'}</td>

                  <td className="text-slate-500 font-medium py-0.5 pl-4">Jalur Pendaftaran</td>
                  <td className="text-slate-400">:</td>
                  <td className="font-semibold text-slate-800 capitalize">{applicant?.registration_path || 'Reguler'}</td>
                </tr>
                <tr className="leading-normal">
                  <td className="text-slate-500 font-medium py-0.5">Asal Sekolah</td>
                  <td className="text-slate-400">:</td>
                  <td className="font-medium text-slate-800">{applicant?.previous_school || '—'}</td>

                  <td className="text-slate-500 font-medium py-0.5 pl-4">Kontak Pendaftar</td>
                  <td className="text-slate-400">:</td>
                  <td className="font-medium text-slate-800 font-mono">{applicant?.phone_number || applicant?.whatsapp_number || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══════════════════════════════════════════
              1. TABEL RINGKASAN KOMPONEN NILAI SELEKSI
              ═══════════════════════════════════════════ */}
          <div className="space-y-1">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-800">
              A. Ringkasan Skor Komponen Seleksi
            </h3>
            <table className="w-full text-[10.5px] border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-1.5 px-2.5 text-center w-8 border-r border-slate-200">No</th>
                  <th className="py-1.5 px-2.5 text-left border-r border-slate-200">Komponen Penilaian</th>
                  <th className="py-1.5 px-2.5 text-left border-r border-slate-200">Metode Pengujian</th>
                  <th className="py-1.5 px-2.5 text-center w-24 border-r border-slate-200">Skor / Nilai</th>
                  <th className="py-1.5 px-2.5 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* TIU */}
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-600 border-r border-slate-200">1</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                    Tes Inteligensi Umum (TIU)
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200">
                    Pilihan Ganda · Safe Exam Browser (SEB)
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                    {tiuScore != null ? (
                      <span className="text-emerald-800 font-black">{tiuScore} <span className="text-slate-400 font-normal">/ 100</span></span>
                    ) : isTiuPath ? (
                      <span className="text-amber-700">Belum Ujian</span>
                    ) : (
                      <span className="text-slate-500 font-medium">Bebas Tes</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[9.5px]">
                    {tiuScore != null
                      ? `Selesai (${tiuCompletedAt ? new Date(tiuCompletedAt).toLocaleDateString('id-ID') : 'Terekam'})`
                      : isTiuPath ? 'Menunggu pelaksanaan ujian SEB' : 'Jalur Bebas Tes TIU'}
                  </td>
                </tr>

                {/* Tahfidz */}
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-600 border-r border-slate-200">2</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                    Ujian Tahfidz Al-Qur&apos;an
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200">
                    Sesi 1:1 Evaluasi Hafalan &amp; Tajwid
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                    {tahfidzAvg != null ? (
                      <span className="text-emerald-800 font-black">{tahfidzAvg} <span className="text-slate-400 font-normal">/ 100</span></span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[9.5px]">
                    {tahfidzAvg != null ? 'Dinilai sesuai rubrik resmi Tahfidz' : 'Belum dievaluasi'}
                  </td>
                </tr>

                {/* Wawancara */}
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-600 border-r border-slate-200">3</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                    Ujian Wawancara Santri &amp; Wali
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200">
                    Sesi 1:1 Kepribadian &amp; Komitmen
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                    {wawancaraAvg != null ? (
                      <span className="text-emerald-800 font-black">{wawancaraAvg} <span className="text-slate-400 font-normal">/ 100</span></span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[9.5px]">
                    {wawancaraAvg != null ? 'Dinilai sesuai rubrik resmi Wawancara' : 'Belum dievaluasi'}
                  </td>
                </tr>

                {/* Kategori Tambahan Lainnya (jika ada) */}
                {otherCats.map((cat, idx) => {
                  const catAvg = calculateAvg(cat.criteria)
                  return (
                    <tr key={idx}>
                      <td className="py-1.5 px-2.5 text-center font-bold text-slate-600 border-r border-slate-200">{4 + idx}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                        {cat.category_name}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200">
                        Penilaian Rubrik Tambahan
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 border-r border-slate-200">
                        {catAvg != null ? (
                          <span className="text-emerald-800 font-black">{catAvg} <span className="text-slate-400 font-normal">/ 100</span></span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 text-[9.5px]">
                        {catAvg != null ? 'Evaluasi selesai' : 'Belum ada penilaian'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ═══════════════════════════════════════════
              2. RINCIAN SKOR PER KRITERIA RUBRIK
              ═══════════════════════════════════════════ */}
          <div className="space-y-1">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-800">
              B. Rincian Penilaian Rubrik Tahfidz &amp; Wawancara
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Kolom Kiri: Rubrik Tahfidz */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 font-bold text-[9.5px] text-slate-800 border-b border-slate-200 flex justify-between items-center">
                  <span>Rubrik Ujian Tahfidz</span>
                  {tahfidzAvg && <span className="text-emerald-800">Rata-rata: {tahfidzAvg}</span>}
                </div>
                <table className="w-full text-[9.5px]">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-1 px-2 text-left">Kriteria</th>
                      <th className="py-1 px-2 text-center w-12">Bobot</th>
                      <th className="py-1 px-2 text-right w-14">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tahfidzCat?.criteria && tahfidzCat.criteria.length > 0 ? (
                      tahfidzCat.criteria.map((cr: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-0.5 px-2 text-slate-700 truncate max-w-[150px]">{cr.criteria_name}</td>
                          <td className="py-0.5 px-2 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-0.5 px-2 text-right font-bold text-slate-900">{cr.score != null ? cr.score : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-2 px-2 text-center text-slate-400 italic">
                          Belum ada nilai kriteria Tahfidz
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Kolom Kanan: Rubrik Wawancara */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 font-bold text-[9.5px] text-slate-800 border-b border-slate-200 flex justify-between items-center">
                  <span>Rubrik Ujian Wawancara</span>
                  {wawancaraAvg && <span className="text-emerald-800">Rata-rata: {wawancaraAvg}</span>}
                </div>
                <table className="w-full text-[9.5px]">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-1 px-2 text-left">Kriteria</th>
                      <th className="py-1 px-2 text-center w-12">Bobot</th>
                      <th className="py-1 px-2 text-right w-14">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wawancaraCat?.criteria && wawancaraCat.criteria.length > 0 ? (
                      wawancaraCat.criteria.map((cr: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-0.5 px-2 text-slate-700 truncate max-w-[150px]">{cr.criteria_name}</td>
                          <td className="py-0.5 px-2 text-center text-slate-500">{cr.weight ? `${cr.weight}%` : '—'}</td>
                          <td className="py-0.5 px-2 text-right font-bold text-slate-900">{cr.score != null ? cr.score : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-2 px-2 text-center text-slate-400 italic">
                          Belum ada nilai kriteria Wawancara
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              3. CATATAN TIM EVALUATOR (GABUNGAN TAHFIDZ & WAWANCARA)
              ═══════════════════════════════════════════ */}
          {hasNotes && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block text-[10px]">Catatan Tim Evaluator / Penguji:</span>
              <div className="space-y-0.5 pl-1 leading-snug">
                {parsedNotes.tahfidz && (
                  <p>
                    <strong className="text-slate-800">Ujian Tahfidz:</strong>{' '}
                    <span className="italic">{parsedNotes.tahfidz}</span>
                  </p>
                )}
                {parsedNotes.wawancara && (
                  <p>
                    <strong className="text-slate-800">Ujian Wawancara:</strong>{' '}
                    <span className="italic">{parsedNotes.wawancara}</span>
                  </p>
                )}
                {parsedNotes.general && !parsedNotes.tahfidz && !parsedNotes.wawancara && (
                  <p className="italic">{parsedNotes.general}</p>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              4. KEPUTUSAN HASIL AKHIR SELEKSI
              (Rata tengah, tanpa badge ekstra di samping)
              ═══════════════════════════════════════════ */}
          <div
            className={`p-2 rounded-lg border text-center ${
              isPassed
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : isFailed
                ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <span className="text-[9.5px] font-bold uppercase tracking-wider block text-slate-600 mb-0.5">
              KEPUTUSAN HASIL AKHIR SELEKSI:
            </span>
            <span
              className={`text-xs font-black tracking-wide uppercase ${
                isPassed ? 'text-emerald-800' : isFailed ? 'text-rose-800' : 'text-amber-800'
              }`}
            >
              {isPassed ? 'LULUS SELEKSI CALON SANTRI' : isFailed ? 'TIDAK LULUS SELEKSI' : 'DALAM PROSES SELEKSI'}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            PENGESAHAN & TANDA TANGAN RESMI SEPERTI LoA
            (Data Asli Real Tanpa Dummy)
            ═══════════════════════════════════════════ */}
        <div className="pt-2 border-t border-slate-200 mt-auto">
          <div className="flex justify-between items-end text-[10px]">
            {/* Sisi Kiri: Verifikasi Keaslian Sistem */}
            <div className="space-y-0.5 max-w-[280px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[9.5px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Dokumen Sah &amp; Terverifikasi Sistem</span>
              </div>
              <p className="text-[8.5px] text-slate-500 leading-tight">
                Rekapitulasi nilai ini sah diterbitkan otomatis dari database seleksi PPDB Pesantren PTDARRAHMAN. Keaslian data dapat diperiksa melalui pemindaian kode QR di samping.
              </p>
              <p className="text-[8px] font-mono text-slate-400">
                REG NO: {regNo}
              </p>
            </div>

            {/* Sisi Kanan: Pengesahan Panitia PPDB seperti di LoA */}
            <div className="text-right space-y-0.5 w-60">
              <p className="text-[9.5px] text-slate-600">Bekasi, {currentDateStr}</p>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">Office of Admission PPDB Ar-Rahman</p>
              <div className="flex justify-end items-center gap-1.5 py-0.5">
                <div className="p-0.5 bg-white border border-slate-200 rounded shadow-2xs">
                  <QRCodeSVG value={officialVerifyUrl} size={36} level="M" />
                </div>
                <div className="text-right">
                  <span className="text-[8.5px] font-mono text-emerald-700 block font-bold leading-tight">VERIFIED DIGITAL</span>
                  <span className="text-[7.5px] text-slate-400 block font-mono leading-tight">PANITIA PPDB</span>
                </div>
              </div>
              <p className="text-[10px] font-bold underline text-slate-900 leading-tight">
                {applicant?.admission_officer || applicant?.head_of_committee || 'Ust. Wijaya Kurnia, M.Pd.'}
              </p>
              <p className="text-[8.5px] text-slate-500 leading-tight">Ketua Panitia Seleksi PPDB</p>
            </div>
          </div>

          <div className="mt-1 text-center text-[8px] text-slate-400 font-mono">
            {schoolAddress} &nbsp;|&nbsp; {activeDomain} &nbsp;|&nbsp; {schoolEmail}
          </div>
        </div>
      </div>
    )
  }
)

OfficialAssessmentSheet.displayName = 'OfficialAssessmentSheet'

export default OfficialAssessmentSheet
