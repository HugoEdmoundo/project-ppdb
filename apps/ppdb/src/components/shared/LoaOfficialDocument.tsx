import { ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export interface LoaData {
  letter_number: string
  registration_number: string
  academic_year: string
  admission_officer: string
  director_name?: string
  location: string
  date_str: string
  applicant: {
    id: string
    full_name: string
    registration_path?: string
    nisn?: string
    nik?: string
    previous_school?: string
    parent_name?: string
  }
  fee_items: Array<{
    id?: string
    name: string
    nominal: number
    description: string
  }>
  total_fee: number
  minimum_dp: number
  discount_name?: string
  deadline_lunas: string
  deadline_lunas_iso?: string
  fixed_clause: string
  is_graduated: boolean
  is_loa_signed: boolean
  loa_signed_at?: string | null
  loa_signer_name?: string | null
  loa_signer_relation?: string | null
  loa_signature_data?: string | null
  loa_signature_token?: string | null
  va_bank?: string
  va_number?: string
  whatsapp_group_link?: string
}

interface LoaOfficialDocumentProps {
  data: LoaData
  page?: 1 | 2 | 'both'
}

export default function LoaOfficialDocument({ data, page = 'both' }: LoaOfficialDocumentProps) {
  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID')
  }

  const app = data.applicant || ({} as any)
  const fullName = app.full_name || 'CALON SANTRI'
  const regNo = data.registration_number || app.id?.slice(0, 8).toUpperCase() || 'REG-PENDARRAHMAN'
  const schoolOrigin = app.previous_school || '-'
  const track = (app.registration_path || 'Reguler').toUpperCase()
  const discountName = data.discount_name || 'Potongan Biaya Pembangunan (Early Bird Gelombang 1)'

  // Verification URL for QR Codes
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ptdarrahman.sch.id'
  const officialVerifyUrl = `${baseUrl}/loa/${regNo}?verify=official`
  const parentVerifyUrl = `${baseUrl}/loa/${regNo}?verify=parent&token=${data.loa_signature_token || ''}`

  const renderPage1 = () => (
    <div className="w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-xl border border-slate-200 p-10 font-sans text-xs flex flex-col justify-between transition-all print:shadow-none print:border-none print:m-0 print:p-8 print:w-full print:min-h-screen page-break-after">
      {/* Header Page Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-3 font-mono">
        <span>PPDB PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL AR-RAHMAN</span>
        <span>Page 1 Of 2</span>
      </div>

      <div className="space-y-4 flex-1">
        {/* Letter Head Top */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] text-slate-500">Kepada Yth.</p>
            <h2 className="text-base font-bold text-slate-900 tracking-wide mt-0.5 uppercase">
              Sdr/Sdri {fullName}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Jalur: {track}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 font-medium">
              {data.location}, {data.date_str}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              LoA Check Access: Terverifikasi
            </div>
          </div>
        </div>

        {/* LoA Title Banner */}
        <div className="text-center py-2.5 border-y-2 border-slate-900 my-1">
          <h1 className="text-lg font-extrabold tracking-wider text-slate-900 uppercase">
            LETTER OF ACCEPTANCE [LoA]
          </h1>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
            Academic Year {data.academic_year}
          </p>
        </div>

        {/* Congratulation Body */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-slate-800">
          <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1">
            Selamat!
          </p>
          <p className="text-xs leading-relaxed text-slate-800 text-justify">
            Anda telah dinyatakan <strong>LULUS</strong> seleksi dan dinyatakan <strong>DITERIMA</strong> sebagai
            santri / peserta didik baru <strong>Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman</strong> dalam
            Academic Year {data.academic_year} melalui jalur pendaftaran &quot;<strong>{track}</strong>&quot;.
          </p>
        </div>

        {/* Biodata Summary */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/70">
                <td className="w-44 py-1.5 px-3 font-semibold text-slate-600">Nama Lengkap</td>
                <td className="py-1.5 px-3 font-bold text-slate-900 uppercase">{fullName}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-slate-600">Nomor Registrasi</td>
                <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">{regNo}</td>
              </tr>
              <tr className="bg-slate-50/70">
                <td className="py-1.5 px-3 font-semibold text-slate-600">Asal Sekolah</td>
                <td className="py-1.5 px-3 text-slate-800">{schoolOrigin}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 font-semibold text-slate-600">Subsidi / Diskon Pendaftar</td>
                <td className="py-1.5 px-3 text-emerald-700 font-semibold">
                  {discountName}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section I: Biaya Pendidikan (Dinamis Akurat dari Gelombang) */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            I. Biaya Pendidikan (Pertama Kali Dibayarkan)
          </h3>
          <table className="w-full text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="py-1.5 px-2.5 w-8 text-center border border-slate-700">No</th>
                <th className="py-1.5 px-2.5 border border-slate-700">Komponen Biaya</th>
                <th className="py-1.5 px-2.5 w-32 border border-slate-700">Biaya (Rp)</th>
                <th className="py-1.5 px-2.5 border border-slate-700">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.fee_items && data.fee_items.length > 0 ? (
                data.fee_items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                    <td className="py-1.5 px-2.5 text-center font-medium">{idx + 1}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">{item.name}</td>
                    <td className="py-1.5 px-2.5 font-mono font-medium">{formatRupiah(item.nominal)}</td>
                    <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">{item.description}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-slate-500 italic">
                    Komponen biaya belum dikonfigurasi pada gelombang ini.
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td colSpan={2} className="py-1.5 px-2.5 text-right uppercase">
                  Total Biaya Pendidikan Masuk
                </td>
                <td className="py-1.5 px-2.5 font-mono text-emerald-700">{formatRupiah(data.total_fee)}</td>
                <td className="py-1.5 px-2.5 text-[11px] font-normal text-slate-600">
                  Dapat dibayarkan 1 (satu) kali lunas atau bertahap (cicilan).
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section II: Cara Pembayaran */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            II. Pilihan Cara Pembayaran (Secara Lunas atau Cicilan)
          </h3>

          {/* A. Pembayaran Penuh (LUNAS) - Tenggat Waktu 6 Bulan Sesuai Arahan */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-700">A. Pembayaran Penuh (LUNAS) dalam Satu Kali Pembayaran</p>
            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-left font-semibold text-slate-700">
                  <th className="py-1 px-2 w-8 text-center border-r border-slate-200">No</th>
                  <th className="py-1 px-2 border-r border-slate-200">Cara Pembayaran</th>
                  <th className="py-1 px-2 w-32 border-r border-slate-200">Biaya (Rp)</th>
                  <th className="py-1 px-2 w-32 border-r border-slate-200">Tenggat Waktu</th>
                  <th className="py-1 px-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 px-2 text-center border-r border-slate-200 font-semibold">1</td>
                  <td className="py-1 px-2 font-bold text-emerald-700 border-r border-slate-200">Pembayaran Penuh (LUNAS)</td>
                  <td className="py-1 px-2 font-mono font-semibold border-r border-slate-200">{formatRupiah(data.total_fee)}</td>
                  <td className="py-1 px-2 text-[11px] font-bold text-red-600 border-r border-slate-200">
                    {data.deadline_lunas}
                  </td>
                  <td className="py-1 px-2 text-[11px] text-slate-600">
                    Pelunasan maksimal 6 (enam) bulan setelah tanggal resmi penerimaan/tanda tangan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* B. Pembayaran Cicilan Bertahap - DIGANTI DENGAN PENJELASAN (TANPA TABEL) */}
          <div className="space-y-1 pt-1">
            <p className="text-[11px] font-semibold text-slate-700">B. Pembayaran Dengan Cicilan Bertahap</p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs leading-relaxed space-y-1.5">
              <p className="text-justify">
                Skema pembayaran cicilan bertahap untuk sisa tagihan biaya pendidikan calon santri bersifat <strong>kustom (customized)</strong> dan tidak ditentukan melalui tabel pembagian kaku.
              </p>
              <p className="text-justify text-[11px] text-slate-600">
                Calon santri wajib menyetorkan <strong>Cicilan Pertama (Minimal Uang Muka / DP) sebesar {formatRupiah(data.minimum_dp)}</strong> untuk penguncian kursi. Selanjutnya, pembagian termin cicilan berikutnya dapat disepakati bersama dan diatur langsung secara mandiri melalui modul sistem baru pada dashboard pendaftar.
              </p>
            </div>
          </div>
        </div>

        {/* Signatures Page 1: Konfirmasi Dua Pihak (Orang Tua & Panitia) */}
        <div className="pt-3 flex justify-between items-end border-t border-slate-200">
          {/* Pihak 1: Orang Tua / Wali */}
          <div className="w-72 border border-dashed border-slate-300 rounded-lg p-2.5 text-center bg-slate-50/70">
            <p className="text-[10px] text-slate-600 font-bold uppercase leading-tight">
              KONFIRMASI MENERIMA KELULUSAN
            </p>
            <p className="text-[9px] text-slate-400 italic mb-1.5">Dua Pihak — Sah Secara Hukum Digital</p>

            {data.is_loa_signed ? (
              <div className="py-1 flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs">
                    <QRCodeSVG value={parentVerifyUrl} size={48} level="M" />
                  </div>
                  {data.loa_signature_data && (
                    <img
                      src={data.loa_signature_data}
                      alt="Tanda Tangan Orang Tua"
                      className="h-10 max-w-[120px] object-contain border-b border-slate-300"
                    />
                  )}
                </div>
                <div className="pt-1">
                  <p className="text-xs font-bold text-slate-900 uppercase">
                    ( {data.loa_signer_name || app.parent_name || 'Orang Tua / Wali Santri'} )
                  </p>
                  <p className="text-[9px] text-emerald-700 font-semibold">
                    Ditandatangani Digital di Aplikasi PPDB
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono">
                    {data.loa_signed_at ? new Date(data.loa_signed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : data.date_str}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2.5 flex flex-col items-center justify-center space-y-1">
                <div className="h-12 w-full flex items-center justify-center border border-dashed border-amber-300 bg-amber-50/50 rounded px-1">
                  <span className="text-[9.5px] text-amber-800 italic font-medium leading-tight">
                    Menunggu Tanda Tangan Digital Orang Tua / Wali di Aplikasi
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-600 pt-1">
                  ( {app.parent_name || 'Orang Tua / Wali Santri'} )
                </p>
              </div>
            )}
          </div>

          {/* Pihak 2: Office of Admission PPDB Ar-Rahman */}
          <div className="text-right space-y-1 w-64">
            <p className="text-xs text-slate-600">Hormat Kami,</p>
            <p className="text-xs font-bold text-slate-900">Office of Admission PPDB Ar-Rahman</p>
            <div className="flex justify-end items-center gap-2 py-1">
              <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs">
                <QRCodeSVG value={officialVerifyUrl} size={48} level="M" />
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-emerald-700 block font-semibold">VERIFIED DIGITAL</span>
                <span className="text-[8px] text-slate-400 block font-mono">PANITIA PPDB</span>
              </div>
            </div>
            <p className="text-xs font-bold underline text-slate-900">{data.admission_officer}</p>
            <p className="text-[10px] text-slate-500">Ketua Panitia Seleksi PPDB</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center text-[10px] text-slate-400">
        <span>Letter of Acceptance (LoA) Resmi - Pesantren Ar-Rahman</span>
        <span className="font-mono">{regNo}</span>
      </div>
    </div>
  )

  const renderPage2 = () => (
    <div className="w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-xl border border-slate-200 p-10 font-sans text-xs flex flex-col justify-between transition-all print:shadow-none print:border-none print:m-0 print:p-8 print:w-full print:min-h-screen">
      {/* Header Page Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-3 font-mono">
        <span>PPDB PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL AR-RAHMAN</span>
        <span>Page 2 Of 2</span>
      </div>

      <div className="space-y-4 flex-1">
        {/* Header Page 2 */}
        <div className="text-center py-2 border-b-2 border-slate-900 mb-2">
          <h1 className="text-base font-extrabold tracking-wider text-slate-900 uppercase">
            TATA CARA PEMBAYARAN BIAYA PENDIDIKAN
          </h1>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
            Academic Year {data.academic_year}
          </p>
        </div>

        {/* Step 1 */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
            I. LANGKAH PERTAMA: Pembayaran Biaya Pendidikan di Aplikasi PPDB
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-justify leading-relaxed">
            <p>
              Pembayaran Biaya Pendidikan dilakukan langsung melalui <strong>Dashboard Aplikasi PPDB Ar-Rahman</strong> menggunakan <strong>QRIS Resmi Terintegrasi</strong> (seluruh mobile banking & e-wallet) baik secara <strong>Lunas sebesar {formatRupiah(data.total_fee)}</strong> (tenggat waktu: <strong>{data.deadline_lunas}</strong>) maupun <strong>Cicilan Pertama (Minimal Uang Muka / DP) sebesar {formatRupiah(data.minimum_dp)}</strong>. Pembayaran yang melampaui batas waktu akan mengakibatkan status kuota kelulusan otomatis dialihkan ke pendaftar cadangan.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
            II. LANGKAH KEDUA: Aktivasi Akun Dashboard & WhatsApp Group (WAJIB)
          </h3>
          <table className="w-full text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="py-1.5 px-3 w-48 border border-slate-200">Informasi Kanal</th>
                <th className="py-1.5 px-3 border border-slate-200">Keterangan & Petunjuk Teknis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800 align-top border border-slate-200">
                  Dashboard Santri Ar-Rahman
                </td>
                <td className="py-2 px-3 text-slate-700 leading-relaxed border border-slate-200">
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Akses dashboard resmi PPDB Ar-Rahman menggunakan nomor registrasi dan password akun pendaftaran Anda.</li>
                    <li>Setelah pembayaran terverifikasi otomatis oleh sistem, unduh bukti kuitansi pembayaran dan Surat Keterangan Diterima (SKD).</li>
                  </ol>
                </td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-3 font-semibold text-slate-800 align-top border border-slate-200">
                  Official WhatsApp Group (WAJIB)
                </td>
                <td className="py-2 px-3 text-slate-700 leading-relaxed border border-slate-200">
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      Tautan WhatsApp Group dikonfigurasi per Periode PPDB aktif calon santri. Silakan gunakan tautan berikut atau tombol di dashboard:
                      {data.whatsapp_group_link && (
                        <div className="mt-1 font-mono text-[10px] text-emerald-800 break-all bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {data.whatsapp_group_link}
                        </div>
                      )}
                    </li>
                    <li>
                      Format nama tampilan WhatsApp diwajibkan baku:{' '}
                      <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">
                        {fullName} - {regNo}
                      </code>
                    </li>
                    <li>Admin panitia akan memverifikasi nomor orang tua/wali santri maksimal 1x24 jam kerja.</li>
                  </ol>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attention & Non-Refundable Clause (Klausul Tetap Wajib) */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-xs font-bold text-red-600 tracking-wide uppercase flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-red-600" />
            Perhatian & Ketentuan Khusus!
          </h3>
          <div className="border border-red-200 bg-red-50/50 rounded p-3 text-slate-800 space-y-1 text-justify leading-relaxed">
            <p>
              1. Apabila pembayaran biaya pendidikan tidak dilakukan hingga batas waktu yang ditentukan, hak kursi dan kuota kelulusan santri dinyatakan gugur.
            </p>
            <p>
              2. Pembayaran cicilan tahap selanjutnya disetorkan secara tertib sesuai skema mandiri yang disepakati melalui aplikasi.
            </p>
            <p className="font-semibold text-red-700 bg-red-100/80 p-2 rounded border border-red-300">
              3. Seluruh dana/biaya yang telah disetorkan tidak dapat dikembalikan dengan kondisi dan alasan apapun (Non-Refundable).
            </p>
          </div>
        </div>

        {/* Rincian Kanal & Metode Pembayaran Terintegrasi Aplikasi */}
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            Rincian Kanal & Metode Pembayaran Resmi Aplikasi
          </h3>
          <p className="text-[11px] text-slate-600">
            Sistem pembayaran terintegrasi otomatis 24 jam langsung di dalam Aplikasi PPDB. Tidak melayani transfer manual ke rekening perorangan:
          </p>
          <table className="w-full text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="py-1.5 px-2.5 border border-slate-700 w-44">Kanal / Layanan</th>
                <th className="py-1.5 px-2.5 border border-slate-700">Metode & Petunjuk Teknis Pembayaran</th>
                <th className="py-1.5 px-2.5 border border-slate-700 w-48">Status Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-2.5 font-semibold text-slate-800 border border-slate-200 align-top">
                  Aplikasi Dashboard PPDB
                  <span className="block text-[10px] text-slate-500 font-normal">Kanal Resmi Calon Santri</span>
                </td>
                <td className="py-2 px-2.5 text-slate-700 border border-slate-200 leading-relaxed text-[11px]">
                  Buka menu <strong>Hasil Kelulusan & LoA</strong> di dashboard pendaftar. Klik <strong>Bayar DP via QRIS</strong> atau <strong>Bayar Cicilan</strong> untuk menampilkan kode bayar dinamis.
                </td>
                <td className="py-2 px-2.5 font-semibold text-emerald-700 border border-slate-200 align-top text-[11px]">
                  Otomatis & Real-Time
                  <span className="block text-[10px] text-slate-500 font-normal">Sistem langsung mengonfirmasi tanpa kirim bukti slip</span>
                </td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-2 px-2.5 font-semibold text-slate-800 border border-slate-200 align-top">
                  QRIS Payment Gateway
                  <span className="block text-[10px] text-slate-500 font-normal">Standar QRIS Nasional</span>
                </td>
                <td className="py-2 px-2.5 text-slate-700 border border-slate-200 leading-relaxed text-[11px]" colSpan={2}>
                  Dapat dibayar melalui <strong>seluruh aplikasi Mobile Banking</strong> (BSI Mobile, BCA Mobile, Livin' Mandiri, BRImo, BNI Mobile, Muamalat DIN) serta <strong>seluruh Dompet Digital</strong> (GoPay, OVO, ShopeePay, DANA, LinkAja).
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2.5 font-semibold text-slate-800 border border-slate-200 align-top">
                  Bukti Pembayaran Sah
                  <span className="block text-[10px] text-slate-500 font-normal">Dokumen Terbit Otomatis</span>
                </td>
                <td className="py-2 px-2.5 text-slate-700 border border-slate-200 leading-relaxed text-[11px]" colSpan={2}>
                  Kuitansi Pembayaran Sah Ber-QR Code serta dokumen Surat Keterangan Diterima (SKD) langsung aktif dan dapat diunduh di dashboard pendaftar setelah pembayaran terkonfirmasi.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures Page 2 */}
        <div className="pt-3 flex justify-between items-end border-t border-slate-200 mt-2">
          <div className="text-left space-y-0.5">
            <p className="text-[10px] text-slate-500 font-semibold">Pusat Bantuan & Layanan Informasi Resmi:</p>
            <p className="text-xs font-bold text-slate-800">WhatsApp Call Center: 0815-1004-0999</p>
            <p className="text-[10px] text-slate-500">Email: admission@ptdarrahman.sch.id</p>
          </div>

          <div className="text-right space-y-1">
            <p className="text-xs text-slate-600">Hormat Kami,</p>
            <p className="text-xs font-bold text-slate-900">Office of Admission PPDB Ar-Rahman</p>
            <div className="flex justify-end items-center gap-2 py-1">
              <div className="p-1 bg-white border border-slate-200 rounded shadow-2xs">
                <QRCodeSVG value={officialVerifyUrl} size={44} level="M" />
              </div>
            </div>
            <p className="text-xs font-bold underline text-slate-900">{data.admission_officer}</p>
            <p className="text-[10px] text-slate-500">Ketua Panitia Seleksi PPDB</p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] text-slate-400">
        <span>Letter of Acceptance (LoA) Resmi - Pesantren Ar-Rahman</span>
        <span>Dokumen Sah Dihasilkan oleh Sistem PPDB</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-8 print:gap-0">
      {(page === 1 || page === 'both') && renderPage1()}
      {(page === 2 || page === 'both') && renderPage2()}
    </div>
  )
}
