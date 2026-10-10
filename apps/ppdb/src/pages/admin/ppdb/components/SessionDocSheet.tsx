import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
} from '@/components/ui'
import {
  BookOpen,
  Clock,
  Sparkles,
  ShieldAlert,
  BellRing,
  HelpCircle,
  FileText,
} from 'lucide-react'

interface SessionDocSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionType?: 'tahfidz' | 'interview'
}

export default function SessionDocSheet({
  open,
  onOpenChange,
  sessionType = 'tahfidz',
}: SessionDocSheetProps) {
  const isTahfidz = sessionType === 'tahfidz'
  const titleText = isTahfidz ? 'Session 1:1 Tahfidz' : 'Session 1:1 Wawancara'

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
                Panduan & Cara Kerja {titleText}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Petunjuk lengkap operasional fitur Session 1:1 untuk admin dan evaluator PPDB.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* 1. Apa itu Session 1:1 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            1. Apa itu Fitur Session 1:1?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            Fitur <strong>Session 1:1</strong> dirancang untuk evaluasi tatap muka langsung secara personal (1 Penguji : 1 Calon Santri). Setiap jadwal yang dibuat admin merupakan slot eksklusif yang nantinya akan dipilih dan dipesan (booking) secara mandiri oleh calon santri melalui dashboard pendaftaran mereka.
          </p>
        </div>

        {/* 2. Arti Warna Kartu Sesi */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            2. Memahami Arti Warna Status Kartu
          </h3>
          <div className="space-y-2.5">
            {/* Merah */}
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 mt-1 shrink-0 animate-pulse" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                    Merah: Belum Diambil / Tersedia
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Sesi baru saja dibuat oleh panitia dan masih terbuka. Belum ada calon santri yang mengambil slot jadwal ini. Jadwal ini masih bisa diedit atau dihapus.
                </p>
              </div>
            </div>

            {/* Kuning */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-amber-500 mt-1 shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] uppercase font-bold tracking-wider">
                    Kuning: Telah Diambil (Siap Diuji)
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Calon santri telah memilih jadwal ini di dashboard mereka. <strong>Klik pada kartu kuning ini</strong> untuk langsung membuka lembar penilaian dan memeriksa data formulir calon santri!
                </p>
              </div>
            </div>

            {/* Hijau */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                    Hijau: Selesai Dinilai
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Penguji telah menginput dan menyimpan nilai evaluasi rubrik ke sistem. Nilai telah tercatat dan pendaftar dapat melangkah ke tahap seleksi berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Aturan Tanggal, Waktu & Sistem Pembersihan Otomatis */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            3. Aturan Tanggal, Waktu & Pembersihan Otomatis
          </h3>
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 leading-relaxed space-y-2.5">
            <div>
              <p className="font-semibold text-amber-900 mb-1">📅 Aturan Penentuan Jadwal:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                <li>Tanggal pelaksanaan <strong>tidak boleh di masa lampau</strong> (paling minimal adalah hari ini).</li>
                <li>Jika membuat sesi untuk hari ini, pastikan <strong>jam mulai belum terlewat</strong> (di masa mendatang).</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-amber-200/60">
              <p className="font-semibold text-amber-900 mb-1">⚡ Pembersihan Otomatis (Auto-Cleanup):</p>
              <p>
                Jika suatu sesi yang dibuat <strong>belum ada yang mengambil (masih merah)</strong> sampai tanggal dan jam pelaksanaan tiba/terlewati, sistem akan <strong>otomatis menghapus sesi tersebut secara permanen dari sistem</strong> (database & tampilan).
              </p>
              <p className="text-[11px] text-amber-800 mt-1 italic">
                *Tip: Saat membuat slot uji coba atau contoh jadwal, selalu tentukan jam mulai di waktu mendatang (atau esok hari) agar slot tidak langsung terhapus otomatis oleh sistem.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Notifikasi WhatsApp Otomatis ke Pembuat Sesi */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-emerald-600" />
            4. Notifikasi WhatsApp ke Evaluator / Admin
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
            <p>
              Setiap kali ada calon santri yang mengambil slot jadwal yang Anda buat, sistem akan otomatis mengirimkan notifikasi pengingat ke nomor WhatsApp Anda:
            </p>
            <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
              <p className="text-emerald-700 font-bold">📅 Jadwal Session 1:1 Telah Diambil Pendaftar</p>
              <p>Halo [Nama Petugas],</p>
              <p>Sesi [Tahfidz/Wawancara] Anda telah diambil oleh calon santri:</p>
              <p>• Nama: [Nama Pendaftar]</p>
              <p>• Waktu: [Tanggal] pukul [Jam] WIB</p>
              <p>• Lokasi/Link: [Link Zoom / Ruangan]</p>
              <p className="text-slate-500 italic mt-1">Harap hadir tepat waktu ya!</p>
            </div>
          </div>
        </div>

        {/* 5. Cara Menginput Nilai */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            5. Alur Input Nilai Ujian
          </h3>
          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li>Cari kartu sesi yang berstatus <strong>Kuning</strong> (Sudah di-take santri).</li>
            <li>Klik kartu tersebut atau tombol <strong>"Input Nilai"</strong>.</li>
            <li>
              Di lembar input penilaian:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-600">
                <li><strong>Kolom Kiri:</strong> Masukkan skor nilai (0-100) sesuai rubrik, nilai terbobot otomatis terkalkulasi. Anda juga dapat memberikan catatan khusus.</li>
                <li><strong>Kolom Kanan:</strong> Memuat seluruh biodata santri dari formulir pendaftaran, data orang tua lengkap, identifikasi kesehatan, nilai tes pendukung, dan berkas persyaratan yang bisa discroll mandiri.</li>
              </ul>
            </li>
            <li>Klik tombol <strong>"Simpan Penilaian"</strong>. Status kartu akan otomatis berganti menjadi <strong>Hijau</strong>.</li>
          </ol>
        </div>

        {/* 6. Bantuan */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-900">
            Ada pertanyaan atau kendala jadwal? Hubungi Koordinator PPDB Pesantren Tahfidz Ar-Rahman.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
