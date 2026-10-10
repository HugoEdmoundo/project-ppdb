import * as React from 'react'
import {
  BookOpen,
  Clock,
  Sparkles,
  ShieldAlert,
  BellRing,
  HelpCircle,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  CreditCard,
  Award,
  CalendarDays,
  FileCheck,
  Settings,
  Archive,
  Layers,
  GraduationCap,
  Shield,
  Activity,
  KeyRound,
  QrCode,
  Smartphone,
  RefreshCw,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
import { Button } from './button'
import { Badge } from './badge'
import { cn } from '../../lib/utils'

export interface DocSection {
  number: number
  title: string
  icon?: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

export interface DocItem {
  title: string
  subtitle: string
  sections: DocSection[]
  contactNote?: string
}

export const SYSTEM_DOCS: Record<string, DocItem> = {
  // ── PPDB ADMIN DOCS ──────────────────────────────────────────────────────────
  'ppdb-data-pendaftar': {
    title: 'Data Pendaftar PPDB',
    subtitle: 'Petunjuk operasional pemantauan dan pengelolaan biodata calon santri.',
    sections: [
      {
        number: 1,
        title: 'Apa itu Halaman Data Pendaftar?',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman <strong>Data Pendaftar</strong> menyajikan seluruh data pendaftar pada gelombang dan periode aktif. Admin dapat memantau progres calon santri mulai dari pengisian biodata, kelengkapan berkas, data orang tua/wali lengkap (Ayah, Ibu, Wali), domisili, hingga kuesioner kesehatan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Memahami Status Pendaftar',
        icon: Clock,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Terdaftar / Menunggu Bayar
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Akun baru dibuat dan formulir telah diisi, menunggu pembayaran biaya registrasi/formulir diselesaikan oleh calon santri.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Dokumen Menunggu Review
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Biaya formulir telah lunas dan pendaftar telah mengunggah berkas persyaratan. Siap diverifikasi oleh panitia di menu <strong>Verifikasi Dokumen</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Tahap Seleksi
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Dokumen dinyatakan lengkap dan disetujui. Santri berhak mengikuti ujian TIU (Safe Exam Browser) dan memilih jadwal Session 1:1 Tahfidz serta Wawancara.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">
                Lulus / Diterima
              </Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Telah menyelesaikan seluruh rangkaian tes dan dinyatakan lulus seleksi oleh penguji/panitia. Santri dapat mengunduh LoA dan menyelesaikan tagihan tahap 2.
              </p>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Aturan Gelombang & Lingkup Data',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">🔒 Hanya Menampilkan Gelombang Aktif:</p>
            <p>
              Data pendaftar pada halaman ini dibatasi secara ketat hanya untuk gelombang yang sedang aktif saat ini. Jika Anda ingin melihat atau menelusuri data santri pada periode atau gelombang lampau, buka menu <strong>Arsip Pendaftar</strong>.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Melihat Detail Profil & Formulir Kesehatan',
        icon: FileText,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Gunakan kolom pencarian di toolbar untuk mencari santri berdasarkan <strong>Nama, Nomor Registrasi, atau NISN</strong>.</li>
            <li>Klik tombol <strong>Detail / Profil</strong> pada baris santri yang dituju.</li>
            <li>Modal akan menampilkan biodata komprehensif: data siswa, data orang tua (Ayah, Ibu, Wali) secara lengkap, riwayat pendidikan, berkas terunggah, serta <strong>Identifikasi Kesehatan</strong> (riwayat penyakit, alergi, dan kontak darurat).</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-verifikasi-dokumen': {
    title: 'Verifikasi Dokumen Persyaratan',
    subtitle: 'Panduan pengecekan dan validasi keabsahan berkas pendaftaran calon santri.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Menu Verifikasi Dokumen',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Fitur ini digunakan oleh panitia administrasi untuk memvalidasi berkas wajib seperti <strong>Kartu Keluarga, Akta Kelahiran, Rapor/Ijazah, Pasfoto</strong>, dan surat pendukung lainnya yang diunggah oleh calon santri setelah membayar formulir.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Keputusan Verifikasi: Setujui vs Tolak',
        icon: FileCheck,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-900">Setujui Dokumen (Valid)</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Jika semua berkas terbaca jelas, asli/legalisir sah, dan sesuai data biodata pendaftar. Santri akan otomatis dipindahkan ke status <strong>Tahap Seleksi</strong>.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-900">Tolak Dokumen (Wajib Beri Catatan)</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Jika dokumen buram, terpotong, atau salah berkas. Admin <strong>wajib mengisi catatan penolakan</strong> agar pendaftar mengetahui dokumen mana yang perlu diunggah ulang.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Notifikasi Otomatis ke WhatsApp Pendaftar',
        icon: BellRing,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Setiap kali admin menekan tombol <strong>Setujui</strong> atau <strong>Tolak</strong>, sistem secara instan mengirim notifikasi WhatsApp otomatis ke nomor pendaftar/orang tua mengabarkan status verifikasi dan instruksi selanjutnya.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Langkah Verifikasi Dokumen',
        icon: FileText,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Pilih pendaftar dengan status <strong>Menunggu Review</strong> pada daftar.</li>
            <li>Klik pratinjau dokumen untuk memeriksa file gambar atau PDF dalam resolusi penuh.</li>
            <li>Periksa kecocokan nama, tanggal lahir, dan NIK pada Akta/KK dengan data formulir.</li>
            <li>Klik <strong>Setujui Semua</strong> jika lengkap, atau klik <strong>Tolak</strong> pada dokumen yang tidak sesuai beserta alasan spesifik.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-pembayaran-formulir': {
    title: 'Pembayaran Formulir Registrasi',
    subtitle: 'Panduan verifikasi pembayaran biaya pendaftaran PPDB.',
    sections: [
      {
        number: 1,
        title: 'Alur Pembayaran Formulir',
        icon: CreditCard,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Calon santri yang baru mendaftar wajib menyelesaikan biaya formulir pendaftaran. Pembayaran dapat diverifikasi secara manual oleh staf keuangan atau terkonfirmasi melalui bukti transfer.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Aturan Kuota & Penutupan Gelombang Otomatis',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">⚡ Kuota Dihitung dari Pembayaran Lunas:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li>Kuota gelombang dihitung dari transaksi pembayaran formulir yang <strong>berhasil (paid)</strong>, bukan dari jumlah pendaftar terbuat.</li>
              <li>Saat kuota tercapai, sistem akan <strong>otomatis menutup gelombang pendaftaran</strong>.</li>
              <li>Seluruh invoice pendaftar yang belum dibayar akan <strong>otomatis dibatalkan</strong>, dan pendaftar diarahkan mendaftar pada gelombang berikutnya.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Pengingat Pembayaran Otomatis Hari Senin',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Selama gelombang masih aktif dan belum penuh, pendaftar dengan status pembayaran pending akan menerima <strong>pengingat WhatsApp otomatis setiap hari Senin</strong> untuk segera menyelesaikan pembayaran. Pengingat dihentikan saat gelombang ditutup.
          </p>
        ),
      },
      {
        number: 4,
        title: 'Cara Konfirmasi Pembayaran Manual',
        icon: CheckCircle2,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Cek bukti transfer yang diunggah pendaftar pada tab <strong>Menunggu Konfirmasi</strong>.</li>
            <li>Cocokkan nominal dan nama rekening pengirim dengan mutasi bank yayasan.</li>
            <li>Klik tombol <strong>Konfirmasi Lunas</strong>. Status pendaftar akan otomatis berubah menjadi aktif dan membuka tahap upload dokumen.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-pembayaran-tahap2': {
    title: 'Pembayaran Tahap 2 (Daftar Ulang)',
    subtitle: 'Panduan pengelolaan tagihan dan cicilan biaya masuk santri baru.',
    sections: [
      {
        number: 1,
        title: 'Apa itu Pembayaran Tahap 2?',
        icon: CreditCard,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Pembayaran Tahap 2 adalah tagihan <strong>Daftar Ulang</strong> yang diterbitkan khusus untuk calon santri yang telah dinyatakan <strong>LULUS</strong> seleksi. Komponen tagihan mencakup Dana Pengembangan Pendidikan (DP3/Gedung), SPP bulan pertama, seragam, buku, dan kegiatan tahunan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Skema Pembayaran: Lunas & Cicilan',
        icon: Layers,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">1. Pembayaran Lunas:</strong>
              Membayar 100% total tagihan daftar ulang sekaligus sebelum tenggat waktu.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">2. Pembayaran Bertahap (Cicilan / Minimal DP):</strong>
              Pendaftar dapat membayar uang muka (DP) minimal sesuai ketentuan gelombang pendaftaran, kemudian melunasi sisa tagihan dalam termin yang disepakati.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Klausul Dana Tidak Dapat Dikembalikan (Non-Refundable)',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">⚠️ Klausul Finansial Mutlak:</p>
            <p>
              Seluruh dana yang telah disetorkan untuk pembayaran daftar ulang tahap 2 bersifat <strong>non-refundable (tidak dapat ditarik kembali)</strong> apabila santri mengundurkan diri, sesuai klausul yang tercantum pada Letter of Acceptance (LoA) dan perjanjian registrasi.
            </p>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Alur Verifikasi Bukti Pembayaran Tahap 2',
        icon: FileText,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Buka kartu tagihan santri pada tabel Pembayaran Tahap 2.</li>
            <li>Klik pada bukti transfer pembayaran untuk melihat bukti setoran.</li>
            <li>Klik <strong>Verifikasi Pembayaran</strong> untuk mengonfirmasi nominal masuk. Sistem otomatis memperbarui sisa tagihan dan riwayat termin santri.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-penilaian': {
    title: 'Hasil Seleksi & Penilaian Akhir',
    subtitle: 'Panduan penetapan keputusan kelulusan dan rekap nilai ujian santri.',
    sections: [
      {
        number: 1,
        title: 'Komponen Nilai Seleksi PPDB',
        icon: Award,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              Total nilai seleksi calon santri dihitung dari tiga pilar evaluasi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                <p className="font-bold text-blue-900 text-xs">1. Tes TIU (Otomatis)</p>
                <p className="text-[11px] text-blue-800 mt-1">Dihitung otomatis via Google Form SEB. Admin tidak menginput nilai ini.</p>
              </div>
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <p className="font-bold text-emerald-900 text-xs">2. Session Tahfidz</p>
                <p className="text-[11px] text-emerald-800 mt-1">Diinput penguji 1:1 berdasarkan rubrik hafalan, tajwid & makhraj.</p>
              </div>
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                <p className="font-bold text-purple-900 text-xs">3. Session Wawancara</p>
                <p className="text-[11px] text-purple-800 mt-1">Diinput pewawancara 1:1 berdasarkan kesiapan dan komitmen santri/wali.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Penetapan Status Kelulusan (Lulus / Tidak Lulus)',
        icon: CheckCircle2,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Lulus</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Santri berhak menerima Letter of Acceptance (LoA) resmi dan diarahkan untuk melakukan daftar ulang / pembayaran tahap 2.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Tidak Lulus</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Santri dinyatakan belum memenuhi syarat kriteria kelulusan PPDB untuk gelombang berjalan.
              </p>
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Publikasi LoA & Notifikasi Hasil',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setelah panitia menetapkan dan menyimpan hasil kelulusan, sistem akan mengirimkan notifikasi WhatsApp hasil seleksi kepada calon santri. Santri yang lulus dapat langsung mengunduh surat kelulusan (LoA) di dashboard mereka.
          </p>
        ),
      },
    ],
  },

  'ppdb-periods': {
    title: 'Periode & Gelombang PPDB',
    subtitle: 'Aturan mutlak konfigurasi periode ajaran dan gelombang pendaftaran.',
    sections: [
      {
        number: 1,
        title: 'Aturan Emas: 1 Periode & 1 Gelombang Aktif',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-900">📌 Aturan Bisnis PPDB:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-900">
              <li><strong>Hanya 1 periode aktif</strong> di seluruh sistem secara global. Mengaktifkan suatu periode otomatis menonaktifkan periode lain.</li>
              <li><strong>Gelombang hanya boleh aktif jika periode induknya aktif</strong>. Menonaktifkan periode otomatis menonaktifkan seluruh gelombang di dalamnya.</li>
              <li><strong>Dalam 1 periode, maksimal hanya ada 1 gelombang aktif</strong>. Mengaktifkan gelombang lain otomatis menggantikan gelombang aktif sebelumnya.</li>
              <li>Pendaftar otomatis masuk ke gelombang aktif; pendaftar tidak memilih gelombang sendiri.</li>
              <li><strong>Tanpa Jenjang Pendidikan:</strong> Sistem PPDB bebas dari pilihan jenjang (SMP/SMK/dll). Jalur hanya memuat tipe seleksi, bukan jenjang.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Komponen Konfigurasi Gelombang',
        icon: Settings,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Jadwal Buka & Tutup:</strong>
              Rentang tanggal publikasi formulir pendaftaran. Pendaftaran ditolak di luar rentang tanggal ini.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Harga Formulir & Kuota:</strong>
              Biaya registrasi awal serta batas maksimal pembayaran formulir yang diterima sistem.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Diskon & Minimal DP:</strong>
              Diskon early bird untuk X pendaftar pertama yang lunas bayar formulir, diskon SPP/DP3, serta nominal minimal uang muka daftar ulang.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Cara Menambah & Mengaktifkan Gelombang',
        icon: CalendarDays,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Pastikan Periode tahun ajaran yang bersangkutan telah aktif.</li>
            <li>Klik tombol <strong>Kelola Gelombang</strong> pada periode terkait.</li>
            <li>Klik <strong>Tambah Gelombang</strong>, isi nama gelombang, tanggal, harga formulir, kuota, dan diskon.</li>
            <li>Aktifkan sakelar gelombang untuk membuka pendaftaran secara publik.</li>
          </ol>
        ),
      },
    ],
  },

  'ppdb-loa-skd': {
    title: 'Template & Preview LoA / SKD',
    subtitle: 'Panduan konfigurasi Surat Kelulusan (LoA) dan Surat Keputusan Direktur.',
    sections: [
      {
        number: 1,
        title: 'Apa itu LoA & SKD?',
        icon: FileText,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <strong>Letter of Acceptance (LoA)</strong> adalah surat resmi ucapan selamat dan pernyataan kelulusan seleksi bagi santri baru. Sedangkan <strong>SKD</strong> (Surat Keputusan Direktur) memuat surat keputusan penerimaan santri baru bernomor registrasi resmi pesantren.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Klausul Tetap (Non-Refundable Clause)',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">🔒 Klausul Wajib:</p>
            <p>
              LoA secara permanen memuat klausul bahwa seluruh dana pembayaran biaya masuk / daftar ulang yang telah disetorkan tidak dapat dikembalikan dengan alasan apa pun.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Pratinjau Real-Time Sebelum Terbit',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Admin dapat menguji dan melihat tampilan preview PDF LoA dengan data dummy sebelum surat diterbitkan ke santri. Dokumen yang sudah diterbitkan kepada santri akan disimpan sebagai arsip tetap (frozen artifact).
          </p>
        ),
      },
    ],
  },

  'ppdb-rubrik': {
    title: 'Rubrik Penilaian Seleksi',
    subtitle: 'Panduan pengaturan kriteria dan bobot evaluasi Tahfidz & Wawancara.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Rubrik Penilaian',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Rubrik penilaian menentukan kriteria apa saja yang akan dinilai oleh penguji saat sesi tatap muka 1:1, beserta porsi persentase (bobot) masing-masing kriteria terhadap nilai akhir.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Kategori Penilaian',
        icon: Layers,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <strong className="text-emerald-900 block mb-0.5">1. Rubrik Tahfidz:</strong>
              Kriteria hafalan Al-Qur'an calon santri (contoh: Kelancaran Hafalan, Makharijul Huruf, Tajwid, dan Irama).
            </div>
            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
              <strong className="text-purple-900 block mb-0.5">2. Rubrik Wawancara:</strong>
              Kriteria wawancara kesiapan santri dan orang tua (contoh: Kesiapan Mondok, Motivasi Belajar, dan Komitmen Orang Tua).
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">3. Tes TIU (Tanpa Rubrik Manual):</strong>
              Nilai TIU murni bersumber otomatis dari pilihan ganda Google Form SEB. Tidak memerlukan rubrik manual di menu ini.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Aturan Pembobotan Kriteria',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">⚖️ Total Bobot Wajib 100%:</p>
            <p>
              Pastikan akumulasi persentase bobot seluruh kriteria dalam satu kategori rubrik bernilai tepat <strong>100%</strong> agar kalkulasi nilai terbobot otomatis bekerja akurat di lembar penilaian penguji.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-tiu-settings': {
    title: 'Pengaturan TIU & Safe Exam Browser (SEB)',
    subtitle: 'Panduan integrasi ujian Google Form pre-filled token dan webhook Apps Script.',
    sections: [
      {
        number: 1,
        title: 'Konsep Integrasi TIU Global',
        icon: Sparkles,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Tes Inteligensi Umum (TIU) menggunakan soal dari Google Form yang dikerjakan via <strong>Safe Exam Browser (SEB)</strong> di komputer/laptop. Pengaturan TIU bersifat <strong>global</strong> untuk seluruh gelombang.
          </p>
        ),
      },
      {
        number: 2,
        title: '3 Parameter Konfigurasi Kunci',
        icon: Settings,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">1. Pre-filled Google Form URL:</strong>
              Tautan Google Form dengan placeholder <code>{'{token}'}</code> pada pertanyaan short answer token. Contoh: <code>...viewform?entry.12345={'{token}'}</code>.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">2. Durasi Ujian (Menit):</strong>
              Batas waktu pengerjaan. Server backend mencatat waktu mulai saat file <code>.seb</code> diunduh. Waktu submit Google Form tidak boleh melebihi durasi ini.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">3. Webhook Secret (X-TIU-Secret):</strong>
              Kunci rahasia untuk memvalidasi kiriman skor nilai dari Google Apps Script ke backend PPDB.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Keamanan: 1 Attempt & Layar Terkunci',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">🛡️ Proteksi Anti-Kecurangan:</p>
            <p>
              SEB mengunci seluruh layar peserta dan menyembunyikan bilah URL browser. Peserta hanya memiliki <strong>1 kali attempt ujian</strong>. Nilai yang masuk via webhook langsung dicatat idempoten dan memicu notifikasi WhatsApp nilai ke peserta.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-arsip': {
    title: 'Arsip Pendaftar & Pencarian Dossier',
    subtitle: 'Pusat pencarian berkas lengkap lintas periode dan ekspor dokumen/ZIP.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Menu Arsip Pendaftar',
        icon: Archive,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Menu <strong>Arsip Pendaftar</strong> adalah satu-satunya tempat untuk melakukan <strong>pencarian data santri lintas seluruh periode dan gelombang</strong> tanpa terikat gelombang aktif operasional saat ini.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Dossier Lengkap 1 Tindakan (One-Click Dossier)',
        icon: FileText,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-900">Dossier santri mencakup seluruh riwayat pendaftaran:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Biodata diri santri dan asal sekolah.</li>
              <li>Data lengkap Orang Tua / Wali (Ayah, Ibu, Wali).</li>
              <li>Kuesioner Identifikasi Kesehatan santri.</li>
              <li>Seluruh dokumen persyaratan yang pernah diunggah & riwayat verifikasinya.</li>
              <li>Hasil ujian TIU, jadwal & lembar evaluasi Session 1:1 Tahfidz & Wawancara.</li>
              <li>Keputusan kelulusan, LoA, dan SKD resmi jika sudah terbit.</li>
              <li>Riwayat transaksi pembayaran formulir dan tagihan daftar ulang tahap 2.</li>
            </ul>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Unduhan Dokumen & Paket ZIP Dossier',
        icon: Sparkles,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              Sistem mendukung unduhan berkas satuan serta <strong>Unduh Dossier ZIP Lengkap</strong> yang memuat rangkuman PDF biodata resmi beserta seluruh lampiran asli santri dalam folder terstruktur.
            </p>
          </div>
        ),
      },
    ],
  },

  'ppdb-notifications': {
    title: 'Notifikasi WhatsApp PPDB',
    subtitle: 'Panduan monitoring pengiriman pesan otomatis ke calon santri dan orang tua.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Log Notifikasi',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman ini mencatat riwayat pengiriman pesan WhatsApp otomatis kepada calon santri, orang tua/wali, serta evaluator penguji selama seluruh alur tahapan PPDB berlangsung.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Pemicu Pesan Otomatis (Triggers)',
        icon: Clock,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Kredensial Akun:</strong>
              Dikirim saat santri baru berhasil registrasi (memuat nomor pendaftaran dan info login).
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Status Pembayaran Formulir:</strong>
              Konfirmasi invoice bayar dan notifikasi lunas saat dana terverifikasi.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Pengingat Pembayaran Senin:</strong>
              Broadcast otomatis setiap Senin bagi pendaftar yang belum menyelesaikan tagihan formulir.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Booking Session 1:1:</strong>
              Konfirmasi jadwal ujian tatap muka kepada santri dan penguji pembuat jadwal.
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <strong className="text-slate-900 block mb-0.5">Hasil TIU & LoA Kelulusan:</strong>
              Pemberitahuan hasil tes kuis TIU dan pengumuman akhir kelulusan santri.
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Memahami Status Pengiriman',
        icon: CheckCircle2,
        content: (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <Badge variant="success" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Terkirim</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Pesan telah berhasil disampaikan ke nomor WhatsApp penerima melalui WhatsApp Gateway.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <Badge variant="destructive" className="text-[10px] uppercase font-bold shrink-0 mt-0.5">Gagal Kirim</Badge>
              <p className="text-xs text-slate-700 leading-relaxed">
                Nomor penerima tidak aktif, tidak terdaftar di WhatsApp, atau koneksi gateway sedang terputus.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },

  // ── SUPERADMIN DOCS ──────────────────────────────────────────────────────────
  'superadmin-applicants': {
    title: 'Pengawasan Pendaftar Global',
    subtitle: 'Panduan kontrol dan audit data seluruh calon santri di sistem pesantren.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Menu Pendaftar Superadmin',
        icon: Users,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Menu ini memberikan pandangan helikopter (tingkat tinggi) terhadap seluruh data santri yang masuk ke sistem, lintas seluruh gelombang, status verifikasi, dan status pembayaran.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Audit & Penanganan Pengecualian',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">🔍 Kewenangan Superadmin:</p>
            <p>
              Superadmin dapat memeriksa detail teknis pendaftaran, menelusuri data mentah pendaftar, serta mengidentifikasi kasus khusus seperti transaksi pending atau anomali data pendaftaran.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-users': {
    title: 'Manajemen Pengguna (Users)',
    subtitle: 'Panduan pengelolaan akun staf, panitia, evaluator, dan admin sistem.',
    sections: [
      {
        number: 1,
        title: 'Pengelolaan Akun Pengguna',
        icon: Users,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Halaman ini digunakan untuk membuat akun staf baru, mengatur peran (role), mereset kata sandi, serta mengaktifkan atau menonaktifkan akses pengguna ke sistem.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Hierarki Tipe Akun',
        icon: Shield,
        content: (
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
              <strong className="text-purple-900 block mb-0.5">Superadmin:</strong>
              Memiliki akses tanpa batas ke seluruh konfigurasi institusi, audit trail, server WhatsApp, dan manajemen user.
            </div>
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
              <strong className="text-blue-900 block mb-0.5">Staff / Panitia (Custom Role):</strong>
              Hak akses dibatasi sesuai izin role yang ditetapkan (Admin PPDB, Keuangan, Penguji Tahfidz, Pewawancara).
            </div>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Keamanan Akun',
        icon: KeyRound,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">🔐 Praktik Terbaik:</p>
            <p>
              Nonaktifkan status akun jika petugas telah selesai bertugas. Jangan pernah membagikan kredensial Superadmin utama kepada sembarang pihak.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-roles': {
    title: 'Peran & Hak Akses (RBAC)',
    subtitle: 'Panduan konfigurasi Role-Based Access Control antar modul.',
    sections: [
      {
        number: 1,
        title: 'Prinsip Role-Based Access Control',
        icon: Shield,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Sistem menggunakan matriks per-modul untuk menentukan apakah suatu peran memiliki izin <strong>Read (Melihat)</strong>, <strong>Write (Mengubah)</strong>, atau <strong>CRUD (Penuh)</strong> pada modul PPDB, Keuangan, Evaluasi, dan Pengaturan.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Membuat & Mengedit Role',
        icon: Settings,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Klik tombol <strong>Tambah Role Baru</strong> di pojok kanan atas.</li>
            <li>Beri nama peran dan deskripsi tanggung jawab pekerjaan.</li>
            <li>Centang kotak izin modul sesuai tugas staf terkait (misal: Penguji Tahfidz hanya membutuhkan akses Evaluasi).</li>
            <li>Simpan perubahan. Perubahan izin akan langsung berlaku pada sesi login berikutnya.</li>
          </ol>
        ),
      },
    ],
  },

  'superadmin-activities': {
    title: 'Audit Trail & Log Aktivitas',
    subtitle: 'Perekaman jejak audit seluruh aktivitas dan mutasi data di sistem.',
    sections: [
      {
        number: 1,
        title: 'Tujuan Perekaman Audit Trail',
        icon: Activity,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Setiap aksi penting di sistem (pembuatan user, penghapusan slot jadwal, verifikasi berkas, perubahan nilai, dll.) dicatat secara permanen untuk menjamin akuntabilitas dan transparansi tata kelola institusi.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Informasi yang Dicatat',
        icon: Clock,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>Setiap entri log memuat:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Pelaku (Actor):</strong> Username dan nama staf yang melakukan aksi.</li>
              <li><strong>Aksi (Action):</strong> Jenis tindakan (CREATE, UPDATE, DELETE, VERIFY, dsb).</li>
              <li><strong>Entitas (Entity):</strong> Modul atau data yang terdampak beserta ID objek.</li>
              <li><strong>Waktu (Timestamp):</strong> Waktu presisi saat kejadian berlangsung.</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  'superadmin-notifications': {
    title: 'Pusat Notifikasi Superadmin',
    subtitle: 'Pemantauan trafik notifikasi sistem dan siaran pesan global.',
    sections: [
      {
        number: 1,
        title: 'Fungsi Menu Notifikasi',
        icon: BellRing,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Memantau kesehatan pengiriman pesan notifikasi sistem, tingkat keberhasilan kirim, serta riwayat kegagalan jaringan antrean pesan WhatsApp.
          </p>
        ),
      },
      {
        number: 2,
        title: 'Penanganan Pesan Gagal',
        icon: ShieldAlert,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">⚠️ Pemeriksaan Kegagalan:</p>
            <p>
              Jika terdapat lonjakan pesan berstatus "Gagal Kirim", periksa status koneksi gateway pada menu <strong>WhatsApp</strong> untuk memastikan nomor resmi pesantren tetap terhubung dan tidak ter-logout.
            </p>
          </div>
        ),
      },
    ],
  },

  'superadmin-whatsapp': {
    title: 'WhatsApp Gateway & Sesi Perangkat',
    subtitle: 'Panduan pairing, pemantauan status sesi, dan integrasi WhatsApp resmi.',
    sections: [
      {
        number: 1,
        title: 'Tentang Layanan WhatsApp Gateway',
        icon: Smartphone,
        content: (
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Layanan WhatsApp Gateway menghubungkan sistem informasi pesantren dengan nomor WhatsApp resmi menggunakan pustaka Baileys. Layanan ini menangani seluruh pengiriman pesan otomatis (OTP, kredensial, konfirmasi bayar, dan hasil seleksi).
          </p>
        ),
      },
      {
        number: 2,
        title: 'Cara Pairing / Scan QR Code',
        icon: QrCode,
        content: (
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Buka WhatsApp di ponsel resmi pesantren $\rightarrow$ Pengaturan $\rightarrow$ <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
            <li>Arahkan kamera ponsel ke QR Code yang muncul di layar dashboard ini.</li>
            <li>Setelah berhasil terhubung, status indikator akan berubah menjadi <strong>Terhubung (Connected)</strong> berwarna hijau.</li>
          </ol>
        ),
      },
      {
        number: 3,
        title: 'Restart Sesi & Penanganan Masalah',
        icon: RefreshCw,
        content: (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-1.5">
            <p className="font-semibold text-amber-900">⚡ Tips Jika Koneksi Terputus:</p>
            <p>
              Gunakan tombol <strong>Restart Session</strong> jika status gateway tertahan pada mode reconnecting atau pesan tidak kunjung terkirim. Jika nomor ter-logout dari WhatsApp ponsel, generate ulang QR Code baru.
            </p>
          </div>
        ),
      },
    ],
  },

  // ── APPLICANT DOCS ───────────────────────────────────────────────────────────
  'applicant-dashboard': {
    title: 'Panduan Alur Pendaftaran Calon Santri',
    subtitle: 'Petunjuk lengkap menyelesaikan 4 tahapan penerimaan santri baru.',
    sections: [
      {
        number: 1,
        title: 'Tahap 1: Pembayaran Formulir',
        icon: CreditCard,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Selesaikan pembayaran biaya formulir registrasi melalui nomor rekening/metode pembayaran yang tertera. Setelah transfer selesai, sistem akan memvalidasi pembayaran Anda untuk membuka akses ke tahap pengunggahan dokumen.
            </p>
          </div>
        ),
      },
      {
        number: 2,
        title: 'Tahap 2: Unggah Dokumen Persyaratan',
        icon: FileText,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Unggah berkas-berkas wajib seperti <strong>Kartu Keluarga, Akta Kelahiran, Rapor/Ijazah, dan Pasfoto</strong>. Pastikan file jelas terbaca (format PDF atau JPG/PNG). Panitia akan memverifikasi berkas Anda.
            </p>
          </div>
        ),
      },
      {
        number: 3,
        title: 'Tahap 3: Ujian TIU & Session 1:1 Tatap Muka',
        icon: GraduationCap,
        content: (
          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
              <strong className="text-blue-950 block mb-0.5">1. Ujian TIU (Safe Exam Browser):</strong>
              Bagi pendaftar jalur tes, kerjakan ujian kuis menggunakan komputer/laptop dengan aplikasi Safe Exam Browser (SEB). Anda hanya memiliki 1 kali kesempatan ujian.
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <strong className="text-emerald-950 block mb-0.5">2. Booking Jadwal Session 1:1:</strong>
              Pilih slot jadwal tes Tahfidz dan Wawancara yang tersedia sesuai kenyamanan Anda (tersedia mode Online via Zoom atau Offline di pesantren).
            </div>
          </div>
        ),
      },
      {
        number: 4,
        title: 'Tahap 4: Pengumuman Kelulusan & Daftar Ulang',
        icon: Award,
        content: (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p>
              Setelah penilaian selesai, periksa hasil kelulusan di dashboard. Jika dinyatakan <strong>LULUS</strong>, unduh surat kelulusan (LoA) resmi dan selesaikan pembayaran daftar ulang tahap 2 sesuai instruksi termin yang tersedia.
            </p>
          </div>
        ),
      },
    ],
  },
}

export interface DocButtonProps {
  onClick?: () => void
  title?: string
  className?: string
  variant?: 'light' | 'dark'
}

export function DocButton({
  onClick,
  title = 'Panduan & Cara Kerja',
  className,
  variant = 'light',
}: DocButtonProps) {
  const isDark = variant === 'dark'
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn(
        'h-10 w-10 rounded-xl transition-colors',
        isDark
          ? 'text-emerald-100 hover:text-white hover:bg-white/15'
          : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50',
        className
      )}
      title={title}
    >
      <BookOpen className="h-5 w-5" />
    </Button>
  )
}

export interface DocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc?: DocItem
  docKey?: string
}

export function DocSheet({ open, onOpenChange, doc, docKey }: DocSheetProps) {
  const activeDoc = doc || (docKey ? SYSTEM_DOCS[docKey] : undefined)
  if (!activeDoc) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto p-6 space-y-6">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-slate-900">
                Panduan & Cara Kerja {activeDoc.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {activeDoc.subtitle}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {activeDoc.sections.map((sec) => {
          const SectionIcon = sec.icon || Sparkles
          return (
            <div key={sec.number} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-emerald-600" />
                {sec.number}. {sec.title}
              </h3>
              {sec.content}
            </div>
          )
        })}

        {/* Footer Bantuan */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-900">
            {activeDoc.contactNote ||
              'Ada pertanyaan atau kendala operasional? Hubungi Koordinator PPDB Pesantren Tahfidz Ar-Rahman.'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export interface DocTriggerProps {
  docKey?: string
  doc?: DocItem
  title?: string
  className?: string
  variant?: 'light' | 'dark'
}

/**
 * Komponen all-in-one yang self-contained:
 * Merender tombol CTA Lucide: book-open dan mengontrol pembukaan slide-over sheet dokumentasinya.
 * Cukup pasang 1 baris di header halaman!
 */
export function DocTrigger({
  docKey,
  doc,
  title,
  className,
  variant = 'light',
}: DocTriggerProps) {
  const [open, setOpen] = React.useState(false)
  const activeDoc = doc || (docKey ? SYSTEM_DOCS[docKey] : undefined)

  if (!activeDoc) return null

  const resolvedTitle = title || `Panduan & Cara Kerja ${activeDoc.title}`

  return (
    <>
      <DocButton
        onClick={() => setOpen(true)}
        title={resolvedTitle}
        className={className}
        variant={variant}
      />
      <DocSheet open={open} onOpenChange={setOpen} doc={activeDoc} />
    </>
  )
}
