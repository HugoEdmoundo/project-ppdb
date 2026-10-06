import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '@repo/ui'
import { ArrowLeft } from 'lucide-react'
import { ScrollGlobe, type GlobeSection } from '@/components/ui'
import { API_BASE } from '@/api/client'

/**
 * Preview untuk ScrollGlobe (`@/components/ui/landing-page.tsx`).
 *
 * Logo & mark diambil dinamis dari API lewat `useBrand` — tidak ada aset logo
 * statis di project ini. `faviconUrl` (kanvas 1:1) dipakai sebagai mark di dalam
 * bola, `logoUrl` (wordmark 2.61:1) diletakkan di samping bola.
 */
export default function GlobeDemoPage() {
  const navigate = useNavigate()
  const { logoUrl, faviconUrl } = useBrand(API_BASE)

  const sections = useMemo<GlobeSection[]>(
    () => [
      {
        id: 'hero',
        badge: 'Selamat Datang',
        title: 'Penerimaan Peserta',
        subtitle: 'Didik Baru',
        description:
          'Pesantren Tahfidz Qur’an dan Digital Ar-Rahman membuka pendaftaran peserta didik baru. Setiap santri belajar dengan ritme sendiri: tahfidz terstruktur, mata pelajaran tematik, dan literasi digital yang dekat dengan kehidupan sehari-hari.',
        align: 'left',
        actions: [
          { label: 'Daftar Sekarang', variant: 'primary', onClick: () => navigate('/register') },
          {
            label: 'Lihat Syarat',
            variant: 'secondary',
            onClick: () => document.getElementById('program')?.scrollIntoView({ behavior: 'smooth' }),
          },
        ],
      },
      {
        id: 'program',
        badge: 'Program',
        title: 'Belajar',
        subtitle: 'Tematik & Digital',
        description:
          'Kurikulum memadukan tahfidz, ilmu pengetahuan terapan, dan literasi digital. Setiap peserta punya guru pembimbing, target hafalan harian, dan laporan perkembangan yang bisa dipantau orang tua dari mana saja.',
        align: 'center',
      },
      {
        id: 'pilihan',
        badge: 'Pilihan Jalur',
        title: 'Sesuai Kebutuhan',
        subtitle: 'Anak & Orang Tua',
        description:
          'Pilihan jalur seleksi (Reguler, Prestasi, Tahfidz, dan Rapot) dibuka sesuai gelombang yang aktif. Halaman pendaftaran otomatis menyembunyikan opsi yang belum dibuka.',
        align: 'left',
        features: [
          {
            title: 'Tahfidz Intensif',
            description: 'Target hafalan harian dengan murojaah terjadwal dan pendampingan wali.',
          },
          {
            title: 'Digital Literacy',
            description: 'Pengenalan teknologi AI, keamanan data, dan etika digital sebagai bekal abad ke-21.',
          },
          {
            title: 'Life Skills',
            description: 'Kewirausahaan, pembiasaan ibadah, dan layanan masyarakat sebagai karakter.',
          },
        ],
      },
      {
        id: 'jadwal',
        badge: 'Jadwal',
        title: 'Daftar Gelombang',
        subtitle: 'Aktif',
        description:
          'Pendaftaran hanya bisa dilakukan ketika tepat satu Periode dan satu Gelombang berstatus aktif. Biaya pendaftaran tahap pertama mengikuti konfigurasi gelombang yang sedang berjalan.',
        align: 'center',
        actions: [
          { label: 'Daftar Sekarang', variant: 'primary', onClick: () => navigate('/register') },
          { label: 'Cek Gelombang', variant: 'secondary', onClick: () => navigate('/') },
        ],
      },
    ],
    [navigate],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-accent/50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali
      </button>

      <ScrollGlobe
        sections={sections}
        markUrl={faviconUrl || logoUrl}
        wordmarkUrl={logoUrl}
        className="bg-gradient-to-br from-background via-muted/20 to-background"
      />
    </>
  )
}
