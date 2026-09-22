import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pesantren Tahfidz Qur'an dan Digital Arrahman",
    short_name: 'PTDARRAHMAN',
    description:
      'Pesantren premium yang menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F5F0',
    theme_color: '#1A6B47',
    // Icons dikosongkan — logo diambil dinamis dari CMS via /companyprofile/settings/logo.
    // PWA icon statis sengaja tidak diisi agar tidak ada branding statis yang stale.
    icons: [],
  }
}
