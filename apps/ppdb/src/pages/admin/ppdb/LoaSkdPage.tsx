import { useState } from 'react'
import {
  FileText,
  Award,
  ShieldCheck,
  Building2,
  QrCode,
  FileBadge,
  Eye,
  Maximize2
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

export default function LoaSkdPage() {
  const [activeTab, setActiveTab] = useState<'loa' | 'skd'>('loa')
  const [loaActivePage, setLoaActivePage] = useState<1 | 2>(1)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  // Dummy Applicant Data
  const sampleData = {
    fullName: 'MUHAMMAD ZIYAD HASAN',
    registrationNo: 'REG-27102501079',
    nisn: '1234567890',
    schoolOrigin: 'SMP Negeri 1 Cikarang Utara',
    registrationTrack: 'Reguler (Tahfidz Qur\'an & Digital)',
    academicYear: '2026 / 2027',
    dateStr: '08 Oktober 2026',
    location: 'Cikarang Utara',
    admissionOfficer: 'Ust. Wijaya Kurnia, M.Pd.',
    directorName: 'Ust. Dr. H. Abdurrahman, M.A.',
    vaBank: 'Bank Syariah Indonesia (BSI)',
    vaNumber: '88560 27 102 501079',
    totalFee: 15000000,
    dpFee: 5000000,
  }

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID')
  }

  return (
    <div className="space-y-6">
      <PageHeaderCard
        title="Pratinjau Dokumen Pengumuman & Kelulusan"
        description="Showcase pratinjau Letter of Acceptance (LoA) 2 halaman dan Surat Keterangan Diterima (SKD) Sertifikat CSS murni yang akan diterima oleh santri yang dinyatakan lulus."
      />

      {/* Document Showcase Card */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileBadge className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg font-semibold text-slate-800">
                  Showcase Pratinjau Dokumen (Dummy Data)
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pilih jenis dokumen untuk melihat format visual dokumen kelulusan yang dihasilkan sistem.
              </p>
            </div>

            {/* Document Selector & Fullscreen Action */}
            <div className="flex items-center gap-2.5">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  onClick={() => setActiveTab('loa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'loa'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  LoA (Surat Keterangan Lulus)
                </button>
                <button
                  onClick={() => setActiveTab('skd')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'skd'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  SKD (Sertifikat CSS Murni)
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullscreenOpen(true)}
                className="gap-1.5 text-xs h-8 bg-white"
              >
                <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                Layar Penuh
              </Button>
            </div>
          </div>

          {/* Sub-navigation for LoA Pages if LoA is selected */}
          {activeTab === 'loa' && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Lembar LoA:</span>
                <div className="inline-flex gap-1.5">
                  <button
                    onClick={() => setLoaActivePage(1)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      loaActivePage === 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Halaman 1: Rincian Kelulusan & Pembiayaan
                  </button>
                  <button
                    onClick={() => setLoaActivePage(2)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      loaActivePage === 2
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Halaman 2: Tata Cara Pembayaran & Rekening VA
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Format Surat Resmi Sesuai Standar Institusi (2 Halaman)
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 bg-slate-100/60 min-h-[600px] flex items-center justify-center overflow-x-auto">
          {activeTab === 'loa' ? (
            <LoaDocumentView
              page={loaActivePage}
              data={sampleData}
              formatRupiah={formatRupiah}
            />
          ) : (
            <SkdCertificateView data={sampleData} />
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Dialog Modal */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6 bg-slate-100">
          <DialogHeader className="pb-3 border-b border-slate-200 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" />
              {activeTab === 'loa' ? 'Pratinjau Letter of Acceptance [LoA]' : 'Pratinjau Surat Keterangan Diterima [SKD]'}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              {activeTab === 'loa' && (
                <div className="inline-flex gap-1 bg-white border border-slate-200 p-0.5 rounded-md">
                  <button
                    onClick={() => setLoaActivePage(1)}
                    className={`px-2 py-1 rounded text-xs ${
                      loaActivePage === 1 ? 'bg-indigo-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Halaman 1
                  </button>
                  <button
                    onClick={() => setLoaActivePage(2)}
                    className={`px-2 py-1 rounded text-xs ${
                      loaActivePage === 2 ? 'bg-indigo-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Halaman 2
                  </button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex justify-center py-4 overflow-x-auto">
            {activeTab === 'loa' ? (
              <LoaDocumentView
                page={loaActivePage}
                data={sampleData}
                formatRupiah={formatRupiah}
              />
            ) : (
              <SkdCertificateView data={sampleData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Component: LoA Document View (2 Pages, matching docs/LoA-27102501079.pdf)
// -----------------------------------------------------------------------------
function LoaDocumentView({
  page,
  data,
  formatRupiah,
}: {
  page: 1 | 2
  data: any
  formatRupiah: (v: number) => string
}) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-xl border border-slate-200 p-10 font-sans text-xs flex flex-col justify-between transition-all">
      {/* Header Page Info */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-4 font-mono">
        <span>PPDB PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL AR-RAHMAN</span>
        <span>Page {page} Of 2</span>
      </div>

      {page === 1 ? (
        /* PAGE 1 CONTENT */
        <div className="space-y-4 flex-1">
          {/* Letter Head Top */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] text-slate-500">Kepada Yth.</p>
              <h2 className="text-base font-bold text-slate-900 tracking-wide mt-0.5 uppercase">
                Sdr/Sdri {data.fullName}
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {data.registrationTrack}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 font-medium">
                {data.location}, {data.dateStr}
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                LoA Check Access: Terverifikasi
              </div>
            </div>
          </div>

          {/* LoA Title Banner */}
          <div className="text-center py-2.5 border-y-2 border-slate-900 my-2">
            <h1 className="text-lg font-extrabold tracking-wider text-slate-900 uppercase">
              LETTER OF ACCEPTANCE [LoA]
            </h1>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
              Academic Year {data.academicYear}
            </p>
          </div>

          {/* Congratulation Body */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 text-slate-800">
            <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1">
              Selamat!
            </p>
            <p className="text-xs leading-relaxed text-slate-800 text-justify">
              Anda telah dinyatakan <strong>LULUS</strong> seleksi dan dinyatakan <strong>DITERIMA</strong> sebagai
              santri / peserta didik baru <strong>Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman</strong> dalam
              Academic Year {data.academicYear} melalui jalur pendaftaran &quot;<strong>{data.registrationTrack}</strong>&quot;.
            </p>
          </div>

          {/* Biodata Summary */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/70">
                  <td className="w-44 py-1.5 px-3 font-semibold text-slate-600">Nama Lengkap</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900">{data.fullName}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-600">Nomor Registrasi</td>
                  <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{data.registrationNo}</td>
                </tr>
                <tr className="bg-slate-50/70">
                  <td className="py-1.5 px-3 font-semibold text-slate-600">Asal Sekolah</td>
                  <td className="py-1.5 px-3 text-slate-800">{data.schoolOrigin}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-600">Subsidi / Diskon Pendaftar</td>
                  <td className="py-1.5 px-3 text-emerald-700 font-semibold">
                    Potongan Biaya Pembangunan (Early Bird Gelombang 1)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section I: Biaya Pendidikan */}
          <div className="space-y-1.5 pt-1">
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
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-medium">1</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800">Biaya Pembangunan (Early Bird 1)</td>
                  <td className="py-1.5 px-2.5 font-mono font-medium">{formatRupiah(10000000)}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                    Potongan diskon pendaftar awal, dibayarkan 1 (satu) kali.
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-1.5 px-2.5 text-center font-medium">2</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800">SPP / Biaya Pendidikan Bulan Pertama</td>
                  <td className="py-1.5 px-2.5 font-mono font-medium">{formatRupiah(1500000)}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                    Biaya bulanan mencakup asrama, konsumsi, dan program tahfidz.
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2.5 text-center font-medium">3</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800">Biaya Matrikulasi (Pre-Pesantren)</td>
                  <td className="py-1.5 px-2.5 font-mono font-medium">{formatRupiah(1000000)}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                    Dibayarkan 1 (satu) kali untuk orientasi dan pembekalan adab.
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-1.5 px-2.5 text-center font-medium">4</td>
                  <td className="py-1.5 px-2.5 font-semibold text-slate-800">Biaya Seragam, Kitab & Modul Digital</td>
                  <td className="py-1.5 px-2.5 font-mono font-medium">{formatRupiah(2500000)}</td>
                  <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                    4 setel seragam santri, paket kitab tahfidz, dan akun LMS.
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-1.5 px-2.5 text-right uppercase">
                    Total Biaya Pendidikan Masuk
                  </td>
                  <td className="py-1.5 px-2.5 font-mono text-emerald-700">{formatRupiah(data.totalFee)}</td>
                  <td className="py-1.5 px-2.5 text-[11px] font-normal text-slate-600">
                    Dapat dibayarkan 1 (satu) kali lunas atau bertahap (cicilan).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section II: Cara Pembayaran */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              II. Pilihan Cara Pembayaran (Secara Lunas atau Cicilan)
            </h3>

            {/* A. Pembayaran Penuh */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-700">A. Pembayaran Penuh (LUNAS) dalam Satu Kali Pembayaran</p>
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-left font-semibold text-slate-700">
                    <th className="py-1 px-2 w-8 text-center border-r border-slate-200">No</th>
                    <th className="py-1 px-2 border-r border-slate-200">Cara Pembayaran</th>
                    <th className="py-1 px-2 w-32 border-r border-slate-200">Biaya (Rp)</th>
                    <th className="py-1 px-2 w-28 border-r border-slate-200">Tenggat Waktu</th>
                    <th className="py-1 px-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 px-2 text-center border-r border-slate-200">1</td>
                    <td className="py-1 px-2 font-bold text-emerald-700 border-r border-slate-200">Pembayaran Penuh (LUNAS)</td>
                    <td className="py-1 px-2 font-mono font-semibold border-r border-slate-200">{formatRupiah(data.totalFee)}</td>
                    <td className="py-1 px-2 text-[11px] border-r border-slate-200">07 November 2026</td>
                    <td className="py-1 px-2 text-[11px] text-slate-600">Melakukan pelunasan sebelum batas akhir waktu.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* B. Pembayaran Cicilan */}
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-semibold text-slate-700">B. Pembayaran Dengan Cicilan Bertahap</p>
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-left font-semibold text-slate-700">
                    <th className="py-1 px-2 w-8 text-center border-r border-slate-200">No</th>
                    <th className="py-1 px-2 border-r border-slate-200">Skema Cicilan</th>
                    <th className="py-1 px-2 w-32 border-r border-slate-200">Biaya (Rp)</th>
                    <th className="py-1 px-2 w-28 border-r border-slate-200">Tenggat Waktu</th>
                    <th className="py-1 px-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-amber-50/40">
                    <td className="py-1 px-2 text-center border-r border-slate-200 font-semibold">1</td>
                    <td className="py-1 px-2 font-bold text-slate-900 border-r border-slate-200">Cicilan 1 (Minimal DP)</td>
                    <td className="py-1 px-2 font-mono font-bold text-slate-900 border-r border-slate-200">{formatRupiah(data.dpFee)}</td>
                    <td className="py-1 px-2 text-[11px] font-semibold text-red-600 border-r border-slate-200">07 November 2026</td>
                    <td className="py-1 px-2 text-[11px] text-slate-600">Wajib dibayar untuk konfirmasi kursi & penguncian kuota.</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 text-center border-r border-slate-200">2</td>
                    <td className="py-1 px-2 border-r border-slate-200">Cicilan 2</td>
                    <td className="py-1 px-2 font-mono border-r border-slate-200">{formatRupiah(2500000)}</td>
                    <td className="py-1 px-2 text-[11px] border-r border-slate-200">07 Desember 2026</td>
                    <td className="py-1 px-2 text-[11px] text-slate-500">Tahap pembayaran cicilan kedua.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-1 px-2 text-center border-r border-slate-200">3</td>
                    <td className="py-1 px-2 border-r border-slate-200">Cicilan 3</td>
                    <td className="py-1 px-2 font-mono border-r border-slate-200">{formatRupiah(2500000)}</td>
                    <td className="py-1 px-2 text-[11px] border-r border-slate-200">07 Januari 2027</td>
                    <td className="py-1 px-2 text-[11px] text-slate-500">Tahap pembayaran cicilan ketiga.</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 text-center border-r border-slate-200">4</td>
                    <td className="py-1 px-2 border-r border-slate-200">Cicilan 4</td>
                    <td className="py-1 px-2 font-mono border-r border-slate-200">{formatRupiah(2500000)}</td>
                    <td className="py-1 px-2 text-[11px] border-r border-slate-200">07 Februari 2027</td>
                    <td className="py-1 px-2 text-[11px] text-slate-500">Tahap pembayaran cicilan keempat.</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-1 px-2 text-center border-r border-slate-200">5</td>
                    <td className="py-1 px-2 font-semibold border-r border-slate-200">Cicilan 5 (Pelunasan)</td>
                    <td className="py-1 px-2 font-mono font-semibold border-r border-slate-200">{formatRupiah(2500000)}</td>
                    <td className="py-1 px-2 text-[11px] border-r border-slate-200">07 Maret 2027</td>
                    <td className="py-1 px-2 text-[11px] text-slate-500">Pelunasan seluruh tagihan daftar ulang.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures Page 1 */}
          <div className="pt-4 flex justify-between items-end border-t border-slate-200">
            <div className="w-64 border border-dashed border-slate-300 rounded p-2 text-center bg-slate-50/60">
              <p className="text-[10px] text-slate-500 font-semibold uppercase leading-tight">
                KONFIRMASI MENERIMA KELULUSAN
              </p>
              <p className="text-[9px] text-slate-400 italic">dengan segala ketentuan yang berlaku</p>
              <div className="h-12 flex items-center justify-center">
                <span className="text-[9px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded">Materai 10.000</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-700 border-t border-slate-200 pt-1">
                [ Tanda Tangan Orang Tua / Wali ]
              </p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-xs text-slate-600">Hormat Kami,</p>
              <p className="text-xs font-bold text-slate-900">Office of Admission PPDB Ar-Rahman</p>
              <div className="h-12 flex items-center justify-end pr-4">
                <span className="font-serif italic text-emerald-800 text-sm opacity-80">Wijaya Kurnia</span>
              </div>
              <p className="text-xs font-bold underline text-slate-900">{data.admissionOfficer}</p>
              <p className="text-[10px] text-slate-500">Ketua Panitia Seleksi PPDB</p>
            </div>
          </div>
        </div>
      ) : (
        /* PAGE 2 CONTENT */
        <div className="space-y-4 flex-1">
          {/* Header Page 2 */}
          <div className="text-center py-2 border-b-2 border-slate-900 mb-3">
            <h1 className="text-base font-extrabold tracking-wider text-slate-900 uppercase">
              TATA CARA PEMBAYARAN BIAYA PENDIDIKAN
            </h1>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
              Academic Year {data.academicYear}
            </p>
          </div>

          {/* Step 1 */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
              I. LANGKAH PERTAMA: Pembayaran Biaya Pendidikan
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-justify leading-relaxed">
              <p>
                Melakukan pembayaran Biaya Pendidikan secara <strong>Lunas sebesar {formatRupiah(data.totalFee)}</strong> atau
                dengan <strong>cicilan pertama (Minimal DP) sebesar {formatRupiah(data.dpFee)}</strong> PALING LAMBAT pada{' '}
                <strong className="text-red-600">07 November 2026</strong>. Pembayaran yang melampaui batas waktu akan
                mengakibatkan status kuota kelulusan otomatis dibatalkan.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5 pt-1">
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
                      <li>Akses dashboard melalui portal resmi PPDB Ar-Rahman menggunakan nomor registrasi dan password akun yang telah dibuat.</li>
                      <li>Setelah pembayaran terverifikasi oleh perbankan secara otomatis, unduh bukti pembayaran lunas/cicilan dan Surat Keterangan Diterima (SKD).</li>
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
                        Tautan WhatsApp Group dikonfigurasi per Periode PPDB aktif calon santri. Silakan klik tombol gabung di dashboard santri Anda.
                      </li>
                      <li>
                        Format nama tampilan WhatsApp diwajibkan menggunakan format identitas baku:{' '}
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">
                          NAMA LENGKAP SANTRI - NOMOR REGISTRASI
                        </code>
                      </li>
                      <li>Admin panitia akan memverifikasi nomor orang tua/wali santri maksimal 1x24 jam kerja.</li>
                    </ol>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Attention & Non-Refundable Clause */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-bold text-red-600 tracking-wide uppercase flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-red-600" />
              Perhatian & Ketentuan Khusus!
            </h3>
            <div className="border border-red-200 bg-red-50/40 rounded p-3 text-slate-800 space-y-1 text-justify leading-relaxed">
              <p>
                1. Apabila pembayaran dilakukan setelah melewati tenggat waktu yang sudah ditentukan, maka kuota kelulusan
                dinyatakan gugur dan hak kursi akan dialihkan ke pendaftar cadangan.
              </p>
              <p>
                2. Pembayaran secara cicilan wajib disetorkan tepat waktu sesuai jadwal tahapan yang tertera pada Letter of Acceptance (LoA).
              </p>
              <p className="font-semibold text-red-700 bg-red-100/70 p-1.5 rounded">
                3. Seluruh dana/biaya yang telah disetorkan tidak dapat dikembalikan dengan kondisi dan alasan apapun (Non-Refundable).
              </p>
            </div>
          </div>

          {/* Bank Transfer / VA Account Table */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
              Rincian Rekening Virtual Account (Bank Transfer)
            </h3>
            <p className="text-[11px] text-slate-600">
              Pembayaran TUNAI TIDAK DITERIMA. Mohon melakukan transfer ke Virtual Account resmi:
            </p>
            <table className="w-full text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-left">
                  <th className="py-1.5 px-3 border border-slate-700">Nama Bank</th>
                  <th className="py-1.5 px-3 border border-slate-700">Nomor Virtual Account (VA)</th>
                  <th className="py-1.5 px-3 border border-slate-700">Atas Nama</th>
                  <th className="py-1.5 px-3 border border-slate-700">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 font-semibold border border-slate-200">{data.vaBank}</td>
                  <td className="py-2 px-3 font-mono font-bold text-sm text-indigo-700 border border-slate-200">
                    {data.vaNumber}
                  </td>
                  <td className="py-2 px-3 font-semibold border border-slate-200 uppercase">
                    PPDB AR-RAHMAN - {data.fullName}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-500 border border-slate-200">
                    Verifikasi pembayaran otomatis 24 Jam.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures Page 2 */}
          <div className="pt-4 flex justify-between items-end border-t border-slate-200 mt-2">
            <div className="text-left space-y-1">
              <p className="text-[10px] text-slate-500">Pusat Bantuan & Layanan Informasi Resmi:</p>
              <p className="text-xs font-bold text-slate-800">WhatsApp Call Center: 0815-1004-0999</p>
              <p className="text-[10px] text-slate-500">Email: admission@ptdarrahman.sch.id</p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-xs text-slate-600">Hormat Kami,</p>
              <p className="text-xs font-bold text-slate-900">Office of Admission PPDB Ar-Rahman</p>
              <div className="h-10 flex items-center justify-end pr-4">
                <span className="font-serif italic text-emerald-800 text-sm opacity-80">Wijaya Kurnia</span>
              </div>
              <p className="text-xs font-bold underline text-slate-900">{data.admissionOfficer}</p>
              <p className="text-[10px] text-slate-500">Ketua Panitia Seleksi PPDB</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] text-slate-400">
        <span>Letter of Acceptance (LoA) Resmi - Pesantren Ar-Rahman</span>
        <span>Dokumen Sah Dihasilkan oleh Sistem PPDB</span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Component: SKD Certificate View (Pure Modern CSS, matching ApplicantSKDModal)
// -----------------------------------------------------------------------------
function SkdCertificateView({ data }: { data: any }) {
  return (
    <div className="relative w-[840px] aspect-[1.414] bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900 text-white shadow-2xl border-4 border-slate-950 overflow-hidden flex flex-col justify-between p-8 select-none print:shadow-none print:border-none print:w-full print:m-0">
      {/* Subtle Islamic Geometric Pattern Watermark in Background */}
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)]"
        style={{ backgroundSize: '24px 24px' }}
      />

      {/* Inner Golden Double Border Frame */}
      <div className="absolute inset-3 border-2 border-amber-500/70 rounded-md pointer-events-none" />
      <div className="absolute inset-5 border border-amber-400/40 rounded-sm pointer-events-none" />

      {/* Four Corner Decorative Flourishes */}
      <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
      <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

      {/* Radial Center Glow */}
      <div className="absolute inset-0 bg-radial from-amber-400/5 via-transparent to-black/40 pointer-events-none" />

      {/* Certificate Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-between text-center px-6 py-2">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-amber-400" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-amber-200/90 font-serif">
              YAYASAN & PESANTREN TAHFIDZ QUR&apos;AN DAN DIGITAL AR-RAHMAN
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest uppercase text-amber-300">
            SURAT KETERANGAN DITERIMA
          </h1>
          <p className="text-[11px] font-serif italic tracking-widest uppercase text-amber-200/70">
            Certificate of Acceptance
          </p>

          <div className="flex items-center justify-center gap-3 pt-0.5">
            <div className="h-[1px] w-14 bg-amber-400/60" />
            <span className="text-[10px] font-mono tracking-wider text-amber-300">
              No. 27102501079/SKD-PPDB/2026
            </span>
            <div className="h-[1px] w-14 bg-amber-400/60" />
          </div>
        </div>

        {/* Body / Awarded To */}
        <div className="space-y-1.5 my-auto py-2">
          <p className="text-xs italic text-slate-300">
            Diberikan kepada / This is proudly presented to:
          </p>

          <h2 className="text-3xl font-serif font-bold tracking-wide uppercase text-white">
            {data.fullName}
          </h2>

          <div className="flex items-center justify-center gap-4 text-xs font-medium">
            <span className="text-amber-200/90">
              NISN: <strong>{data.nisn}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-200/90">
              No. Registrasi: <strong>{data.registrationNo}</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-200/90">
              Jalur: <strong>{data.registrationTrack}</strong>
            </span>
          </div>

          <div className="max-w-2xl mx-auto text-xs leading-relaxed text-center pt-2 text-slate-200/90">
            Berdasarkan Keputusan Panitia Seleksi PPDB, yang bersangkutan telah memenuhi seluruh kriteria
            kelayakan dan secara resmi dinyatakan <strong className="text-amber-300">LULUS</strong> serta{' '}
            <strong className="text-amber-300">DITERIMA</strong> sebagai Santri Baru pada{' '}
            <strong>Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman</strong>.
          </div>
        </div>

        {/* Footer: QR Code, Gold Seal Badge, Signature */}
        <div className="grid grid-cols-3 items-end pt-2 border-t border-amber-500/30">
          {/* Left: QR Code Verification */}
          <div className="text-left flex items-center gap-2.5">
            <div className="p-1 rounded bg-white/10 border border-amber-400/40 text-amber-300">
              <QrCode className="h-8 w-8" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold block text-white">
                VALIDASI DIGITAL
              </span>
              <span className="text-[8px] block text-slate-400">
                Dokumen sah diterbitkan sistem PPDB
              </span>
            </div>
          </div>

          {/* Center: Gold Seal Emblem */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-slate-950 flex flex-col items-center justify-center shadow-lg">
              <Award className="h-4 w-4" />
              <span className="text-[6px] font-extrabold uppercase tracking-tighter">OFFICIAL</span>
            </div>
            <span className="text-[8px] font-semibold mt-0.5 tracking-wider text-amber-300">
              PPDB AR-RAHMAN 2026
            </span>
          </div>

          {/* Right: Signature */}
          <div className="text-right space-y-0.5">
            <p className="text-[9px] text-slate-300">
              {data.location}, {data.dateStr}
            </p>
            <div className="h-8 flex items-center justify-end pr-2">
              <span className="font-serif italic text-emerald-300 text-xs font-semibold opacity-90">
                Dr. H. Abdurrahman, M.A.
              </span>
            </div>
            <p className="text-xs font-bold underline text-white">
              {data.directorName}
            </p>
            <p className="text-[9px] text-amber-200/80">
              Pengasuh / Direktur Pesantren
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
