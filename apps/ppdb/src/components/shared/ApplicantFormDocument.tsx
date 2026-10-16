import { useState, useEffect } from 'react'
import { Award, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { API_BASE } from '@/api/client'
import { parseHealthData } from '@/utils/exportApplicantForm'
import type { Applicant } from '@/types/ppdb'

interface ApplicantFormDocumentProps {
  applicant: Applicant | any
  page?: 1 | 2 | 'both'
}

export default function ApplicantFormDocument({
  applicant,
  page = 'both',
}: ApplicantFormDocumentProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(
    'https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png'
  )
  const [contactInfo, setContactInfo] = useState<{
    address?: string
    email_primary?: string
    email_admission?: string
  }>({})

  useEffect(() => {
    // 1. Ambil Logo Resmi Institusi (Bukan Favicon)
    fetch(`${API_BASE}/companyprofile/settings/logo`)
      .then((res) => (res.ok ? res.json() : null))
      .then((logoData) => {
        if (logoData?.value) {
          setLogoUrl(logoData.value)
        }
      })
      .catch(() => {})

    // 2. Ambil Kontak Resmi Lembaga
    fetch(`${API_BASE}/companyprofile/contact-info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData) {
          setContactInfo({
            address: resData.address,
            email_primary: resData.email_primary,
            email_admission: resData.email_admission,
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!applicant) return null

  const health = parseHealthData(applicant.disease_history)
  const regNo = applicant.nisn || applicant.nik || (applicant.id ? applicant.id.slice(0, 8).toUpperCase() : 'REG-PPDB')
  const fullName = applicant.full_name || 'CALON SANTRI'
  const isPaid = (applicant.payment_status || '').toLowerCase() === 'paid'
  const schoolAddress =
    contactInfo.address ||
    'Rukan Hexa Green Kalimalang, Jl. Inspeksi Kalimalang C8-C9, Jatimulya, Tambun Selatan, Bekasi 17510'
  const schoolEmail =
    contactInfo.email_admission || contactInfo.email_primary || 'info@ptdarrahman.sch.id'

  const activeOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ptdarrahman.sch.id'
  const verifyUrl = `${activeOrigin}/receipt/${applicant.id || regNo}`

  const createdDateStr = applicant.created_at
    ? new Date(applicant.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  // Kop Resmi Lembaga
  const renderKop = () => (
    <div className="border-b-2 border-emerald-900 pb-3 mb-3">
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
          <h2 className="text-[13.5px] sm:text-[14px] font-black tracking-tight text-slate-900 uppercase leading-tight whitespace-nowrap">
            PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL ARRAHMAN
          </h2>
          <p className="text-[9.5px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-wide mt-1 whitespace-nowrap">
            PANITIA PENERIMAAN PESERTA DIDIK BARU TAHUN AJARAN 2026/2027
          </p>
        </div>

        {/* Kolom Kanan: QR Code Verifikasi Resmi */}
        <div className="shrink-0 flex items-center justify-end">
          <div className="flex flex-col items-center">
            <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs">
              <QRCodeSVG value={verifyUrl} size={38} level="M" />
            </div>
            <span className="text-[7px] font-mono text-slate-400 mt-0.5">Verifikasi</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderFooter = (pageNo: 1 | 2) => (
    <div className="border-t border-slate-200 pt-2 mt-auto">
      <div className="flex flex-col xs:flex-row justify-between items-center gap-1 text-[9px] text-slate-500">
        <p className="truncate max-w-[500px]">{schoolAddress}</p>
        <p className="font-mono text-slate-600 font-semibold shrink-0">
          WhatsApp: 0815-1004-0999 &nbsp;|&nbsp; {schoolEmail}
        </p>
      </div>
      <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono mt-0.5">
        <span>Formulir Pendaftaran Calon Santri Baru · Sistem Resmi PPDB PTDARRAHMAN</span>
        <span>Halaman {pageNo} dari 2 · Reg: {regNo}</span>
      </div>
    </div>
  )

  // HALAMAN 1
  const renderPage1 = () => (
    <div
      data-page="1"
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
      className="applicant-form-page a4-document-page relative bg-white mx-auto shadow-md flex flex-col justify-between overflow-hidden text-slate-900 border border-slate-200 mb-6 print:mb-0 print:shadow-none print:border-none print:p-[10mm_14mm] page-break-after"
    >
      <div>
        {renderKop()}

        {/* Header Judul Formulir */}
        <div className="text-center mb-3">
          <h1 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
            LEMBAR FORMULIR PENDAFTARAN RESMI CALON SANTRI BARU
          </h1>
          <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">
            {applicant.period_name || 'PERIODE AKTIF'} · GELOMBANG: {(applicant.wave_name || 'GELOMBANG PPDB').toUpperCase()}
          </p>
        </div>

        {/* Ringkasan Registrasi Card */}
        <div className="grid grid-cols-4 gap-2 bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2.5 mb-3 text-xs">
          <div>
            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">No. Registrasi</span>
            <span className="font-mono font-bold text-emerald-950 text-xs">{regNo}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Jalur Pendaftaran</span>
            <span className="font-semibold text-slate-900 capitalize text-xs">
              {applicant.registration_path || 'Reguler'}
            </span>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Tanggal Daftar</span>
            <span className="font-medium text-slate-800 text-xs">{createdDateStr}</span>
          </div>
          <div>
            <span className="text-[9.5px] text-slate-500 block uppercase font-bold">Status Biaya Formulir</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isPaid ? 'LUNAS (TERVERIFIKASI)' : 'MENUNGGU PEMBAYARAN'}
            </span>
          </div>
        </div>

        {/* BAGIAN 1: IDENTITAS CALON SANTRI */}
        <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <h3 className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-700 rounded-xs inline-block" />
              1. Identitas Lengkap Calon Santri
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">Bagian Santri</span>
          </div>

          {/* Nama Lengkap - Desain Khusus Siap Nama Sangat Panjang */}
          <div className="mb-2 bg-white p-2.5 rounded border border-slate-200/90 shadow-2xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Nama Lengkap Calon Santri
            </span>
            <p className="text-sm font-bold text-slate-900 break-words hyphens-auto leading-snug mt-0.5">
              {fullName}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-[11px]">
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Nomor Induk Siswa Nasional (NISN)</span>
              <span className="font-semibold text-slate-900 font-mono">{applicant.nisn || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Nomor Induk Kependudukan (NIK)</span>
              <span className="font-semibold text-slate-900 font-mono">{applicant.nik || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Jenis Kelamin</span>
              <span className="font-semibold text-slate-900">
                {applicant.gender === 'L' ? 'Laki-laki (Ikhwan)' : applicant.gender === 'P' ? 'Perempuan (Akhwat)' : '-'}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Tempat, Tanggal Lahir</span>
              <span className="font-semibold text-slate-900 break-words">
                {applicant.birth_place || '-'}, {applicant.birth_date || '-'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Asal Sekolah / Madrasah</span>
              <span className="font-semibold text-slate-900 break-words">{applicant.previous_school || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Nomor WhatsApp / HP Santri</span>
              <span className="font-semibold text-slate-900 font-mono">{applicant.phone || '-'}</span>
            </div>

            <div className="col-span-3">
              <span className="text-[9px] text-slate-500 block font-medium">Alamat Email Santri</span>
              <span className="font-semibold text-slate-900 font-mono break-all">{applicant.email || '-'}</span>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: DATA TEMPAT TINGGAL & DOMISILI */}
        <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <h3 className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-700 rounded-xs inline-block" />
              2. Data Tempat Tinggal & Domisili
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">Alamat Sesuai KK</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 text-[11px]">
            <div className="col-span-4 bg-white p-2 rounded border border-slate-200/80">
              <span className="text-[9px] text-slate-500 block font-medium">Alamat Lengkap</span>
              <p className="font-medium text-slate-900 break-words leading-tight mt-0.5">
                {applicant.address || '-'}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Kelurahan / Desa</span>
              <span className="font-semibold text-slate-900 break-words">{applicant.village || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Kecamatan</span>
              <span className="font-semibold text-slate-900 break-words">{applicant.district || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Kota / Kabupaten</span>
              <span className="font-semibold text-slate-900 break-words">{applicant.city || '-'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block font-medium">Provinsi & Kode Pos</span>
              <span className="font-semibold text-slate-900 break-words">
                {applicant.province || '-'} {applicant.postal_code ? `(${applicant.postal_code})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* BAGIAN 3: DATA ORANG TUA / WALI */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <h3 className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-700 rounded-xs inline-block" />
              3. Data Orang Tua / Wali Lengkap
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">Keluarga Santri</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-[11px]">
            {/* Ayah */}
            <div className="bg-white p-2.5 rounded border border-slate-200/90 space-y-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-800 text-[10px]">Data Ayah Kandung</span>
                <span className="text-[8.5px] text-slate-400">Kepala Keluarga</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Nama Lengkap Ayah</span>
                <span className="font-bold text-slate-900 break-words">
                  {applicant.father_name || applicant.parent_name || '-'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <div>
                  <span className="text-[9px] text-slate-500 block">No. WhatsApp Ayah</span>
                  <span className="font-medium text-slate-800 font-mono">{applicant.father_phone || applicant.parent_phone || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Pekerjaan</span>
                  <span className="font-medium text-slate-800 break-words">{applicant.father_job || '-'}</span>
                </div>
              </div>
            </div>

            {/* Ibu */}
            <div className="bg-white p-2.5 rounded border border-slate-200/90 space-y-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <span className="font-bold text-slate-800 text-[10px]">Data Ibu Kandung</span>
                <span className="text-[8.5px] text-slate-400">Orang Tua</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Nama Lengkap Ibu</span>
                <span className="font-bold text-slate-900 break-words">
                  {applicant.mother_name || '-'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <div>
                  <span className="text-[9px] text-slate-500 block">No. WhatsApp Ibu</span>
                  <span className="font-medium text-slate-800 font-mono">{applicant.mother_phone || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Pekerjaan</span>
                  <span className="font-medium text-slate-800 break-words">{applicant.mother_job || '-'}</span>
                </div>
              </div>
            </div>

            {/* Wali (jika ada) atau Kontak Tambahan */}
            {applicant.guardian_name ? (
              <div className="col-span-2 bg-white p-2.5 rounded border border-slate-200/90 space-y-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="font-bold text-slate-800 text-[10px]">Data Wali Santri</span>
                  <span className="text-[8.5px] text-slate-400">Hubungan: {applicant.guardian_relation || 'Wali'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Nama Lengkap Wali</span>
                    <span className="font-bold text-slate-900 break-words">{applicant.guardian_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">No. WhatsApp Wali</span>
                    <span className="font-medium text-slate-800 font-mono">{applicant.guardian_phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Pekerjaan</span>
                    <span className="font-medium text-slate-800 break-words">{applicant.guardian_job || '-'}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Email & Penghasilan */}
            <div className="col-span-2 bg-emerald-50/50 p-2 rounded border border-emerald-100 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500 block">Email Orang Tua / Wali:</span>
                <span className="font-semibold text-slate-900 font-mono break-all">{applicant.parent_email || '-'}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Rentang Penghasilan Keluarga:</span>
                <span className="font-semibold text-emerald-900">{applicant.parent_income || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderFooter(1)}
    </div>
  )

  // HALAMAN 2
  const renderPage2 = () => (
    <div
      data-page="2"
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
      className="applicant-form-page a4-document-page relative bg-white mx-auto shadow-md flex flex-col justify-between overflow-hidden text-slate-900 border border-slate-200 print:shadow-none print:border-none print:p-[10mm_14mm]"
    >
      <div>
        {/* Header Lanjutan Lembar 2 */}
        <div className="border-b-2 border-emerald-900 pb-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Ar-Rahman"
                className="h-9 w-auto max-w-[130px] object-contain shrink-0"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <Award className="h-4 w-4 text-emerald-200" />
              </div>
            )}
            <div className="border-l border-emerald-900/30 pl-2.5">
              <h2 className="text-xs font-black tracking-tight text-slate-900 uppercase leading-snug">
                PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL ARRAHMAN
              </h2>
              <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                LEMBAR FORMULIR PENDAFTARAN — HALAMAN 2
              </p>
            </div>
          </div>
          <div className="text-right text-[9.5px]">
            <span className="font-bold text-slate-900 block break-words max-w-[280px]">
              {fullName}
            </span>
            <span className="text-slate-500 font-mono text-[9px]">Reg: {regNo}</span>
          </div>
        </div>

        {/* BAGIAN 4: KUESIONER IDENTIFIKASI RIWAYAT KESEHATAN (10 BUTIR BAKU) */}
        <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50/40">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <h3 className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-700 rounded-xs inline-block" />
              4. Formulir Kuesioner Identifikasi Kesehatan Santri
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">10 Butir Terverifikasi</span>
          </div>

          <div className="space-y-1.5 text-[10.5px]">
            {/* Butir 1 */}
            <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800 block">
                  1. Apakah calon santri memiliki riwayat penyakit kronis atau berat?
                </span>
                {health?.chronic_disease && health.chronic_disease_description && (
                  <p className="text-[10px] text-rose-700 font-medium pl-1.5 border-l-2 border-rose-400 mt-0.5 break-words">
                    Keterangan: {health.chronic_disease_description}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${
                  health?.chronic_disease
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {health?.chronic_disease ? 'YA' : 'TIDAK'}
              </span>
            </div>

            {/* Butir 2 */}
            <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800 block">
                  2. Diagnosis kondisi medis tertentu (ADHD, Asma, Epilepsi, dll.):
                </span>
                {health?.diagnosed_conditions && health.diagnosed_conditions.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {health.diagnosed_conditions.map((c, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-medium border border-slate-200">
                        {c === 'Lainnya' && health.diagnosed_conditions_other ? `Lainnya: ${health.diagnosed_conditions_other}` : c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9.5px] text-slate-400 italic">Tidak ada kondisi khusus</p>
                )}
                {health?.diagnosed_conditions_description && (
                  <p className="text-[10px] text-emerald-800 font-medium pl-1.5 border-l-2 border-emerald-400 mt-0.5 break-words">
                    {health.diagnosed_conditions_description}
                  </p>
                )}
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                {health?.diagnosed_conditions && health.diagnosed_conditions.length > 0 ? 'TERCATAT' : 'NIHIL'}
              </span>
            </div>

            {/* Butir 3 */}
            <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800 block">
                  3. Riwayat alergi (makanan, obat-obatan, dingin/debu):
                </span>
                {health?.allergies && (
                  <div className="mt-0.5 space-y-0.5">
                    {health.allergy_types && health.allergy_types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {health.allergy_types.map((a, idx) => (
                          <span key={idx} className="bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded text-[9px] font-medium border border-amber-200">
                            {a === 'Lainnya' && health.allergy_other ? `Lainnya: ${health.allergy_other}` : a}
                          </span>
                        ))}
                      </div>
                    )}
                    {health.allergy_description && (
                      <p className="text-[10px] text-amber-800 font-medium pl-1.5 border-l-2 border-amber-400 break-words">
                        {health.allergy_description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${
                  health?.allergies
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {health?.allergies ? 'YA' : 'TIDAK'}
              </span>
            </div>

            {/* Butir 4 & 5 (2 Kolom berdampingan) */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block text-[10px]">
                    4. Pengobatan rutin dokter:
                  </span>
                  {health?.regular_medication && health.regular_medication_description && (
                    <p className="text-[9.5px] text-slate-600 pl-1 border-l-2 border-indigo-400 mt-0.5 break-words">
                      {health.regular_medication_description}
                    </p>
                  )}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                  {health?.regular_medication ? 'YA' : 'TIDAK'}
                </span>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block text-[10px]">
                    5. Keterbatasan fisik / disabilitas:
                  </span>
                  {health?.physical_limitation && health.physical_limitation_description && (
                    <p className="text-[9.5px] text-slate-600 pl-1 border-l-2 border-indigo-400 mt-0.5 break-words">
                      {health.physical_limitation_description}
                    </p>
                  )}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                  {health?.physical_limitation ? 'YA' : 'TIDAK'}
                </span>
              </div>
            </div>

            {/* Butir 6 & 7 (2 Kolom berdampingan) */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block text-[10px]">
                    6. Rawat inap / operasi (2 thn):
                  </span>
                  {health?.hospitalization_history && health.hospitalization_history_description && (
                    <p className="text-[9.5px] text-slate-600 pl-1 border-l-2 border-indigo-400 mt-0.5 break-words">
                      {health.hospitalization_history_description}
                    </p>
                  )}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                  {health?.hospitalization_history ? 'YA' : 'TIDAK'}
                </span>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 block text-[10px]">
                    7. Kebutuhan khusus saat belajar:
                  </span>
                  {health?.special_needs && health.special_needs_description && (
                    <p className="text-[9.5px] text-slate-600 pl-1 border-l-2 border-indigo-400 mt-0.5 break-words">
                      {health.special_needs_description}
                    </p>
                  )}
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-slate-100 text-slate-700 border border-slate-200">
                  {health?.special_needs ? 'YA' : 'TIDAK'}
                </span>
              </div>
            </div>

            {/* Butir 8, 9, 10: Kontak Darurat */}
            <div className="bg-emerald-50/70 p-2.5 rounded border border-emerald-200 grid grid-cols-3 gap-2">
              <div>
                <span className="text-[8.5px] text-slate-500 uppercase font-bold block">8. Nama Kontak Darurat</span>
                <span className="font-bold text-slate-900 text-[10.5px] break-words">
                  {health?.emergency_contact_name || '-'}
                </span>
              </div>
              <div>
                <span className="text-[8.5px] text-slate-500 uppercase font-bold block">9. Hubungan Keluarga</span>
                <span className="font-semibold text-slate-900 text-[10.5px]">
                  {health?.emergency_contact_relation || '-'}
                </span>
              </div>
              <div>
                <span className="text-[8.5px] text-slate-500 uppercase font-bold block">10. No. Telepon / WA Darurat</span>
                <span className="font-bold text-slate-900 text-[10.5px] font-mono">
                  {health?.emergency_contact_phone || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 5: LEMBAR PERNYATAAN KELUARGA */}
        <div className="border border-slate-200 rounded-lg p-2 mb-2 bg-white text-[9.5px] space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-900 font-bold uppercase tracking-wider text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
            <span>5. Pernyataan Keabsahan Data & Tata Tertib Pesantren</span>
          </div>
          <p className="text-slate-600 leading-snug text-justify">
            Dengan ini orang tua / wali dan calon santri menyatakan bahwa seluruh data yang diisikan dalam formulir
            pendaftaran ini adalah benar, sah, dan dapat dipertanggungjawabkan. Kami memahami serta menyetujui seluruh
            ketentuan seleksi, kurikulum kepesantrenan tahfidz dan teknologi digital, serta tata tertib yang berlaku
            di Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman.
          </p>
        </div>

        {/* BAGIAN 6: LEMBAR PENGESAHAN & TANDA TANGAN (Persis Format LoA) */}
        <div className="pt-1.5 flex justify-between items-end border-t border-slate-200 mt-1">
          {/* Kolom Kiri: Layanan Bantuan Resmi (Persis Format LoA) */}
          <div className="text-left space-y-0.5">
            <p className="text-[9.5px] text-slate-500 font-semibold uppercase tracking-wider">
              Pusat Layanan Informasi & Bantuan PPDB:
            </p>
            <p className="text-[11px] font-bold text-slate-800">
              WhatsApp Call Center: 0815-1004-0999
            </p>
            <p className="text-[9.5px] text-slate-600">
              Email: {schoolEmail}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[8.5px] font-medium mt-0.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Dokumen Sah & Terdaftar Resmi di Sistem PPDB Ar-Rahman</span>
            </div>
          </div>

          {/* Kolom Kanan: Office of Admission PPDB Ar-Rahman (Persis Format LoA) */}
          <div className="text-right space-y-0.5 w-60">
            <p className="text-[10px] text-slate-600">Bekasi, {createdDateStr}</p>
            <p className="text-[11px] text-slate-600 leading-tight">Hormat Kami,</p>
            <p className="text-[11px] font-bold text-slate-900 leading-tight">Office of Admission PPDB Ar-Rahman</p>
            <div className="flex justify-end items-center gap-1.5 py-0.5">
              <div className="p-0.5 bg-white border border-slate-200 rounded shadow-2xs">
                <QRCodeSVG value={verifyUrl} size={36} level="M" />
              </div>
              <div className="text-right">
                <span className="text-[8.5px] font-mono text-emerald-700 block font-semibold leading-tight">
                  VERIFIED DIGITAL
                </span>
                <span className="text-[8px] text-slate-400 block font-mono leading-tight">
                  PANITIA PPDB
                </span>
              </div>
            </div>
            <p className="text-[11px] font-bold underline text-slate-900 leading-tight">
              {applicant.admission_officer || applicant.head_of_committee || 'Ust. Wijaya Kurnia, M.Pd.'}
            </p>
            <p className="text-[9.5px] text-slate-500 leading-tight">Ketua Panitia Seleksi PPDB</p>
          </div>
        </div>
      </div>

      {renderFooter(2)}
    </div>
  )

  return (
    <div className="w-full flex flex-col items-center gap-8 print:gap-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .applicant-form-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 10mm 14mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .applicant-form-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
      {(page === 'both' || page === 1) && renderPage1()}
      {(page === 'both' || page === 2) && renderPage2()}
    </div>
  )
}
