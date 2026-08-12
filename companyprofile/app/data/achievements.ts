export interface Achievement {
  id: string
  year: number
  image: string
  content: {
    title: string
    desc: string
    scope: 'International' | 'National' | 'Provincial'
  }
}

export const achievements: Achievement[] = [
  {
    id: '1',
    year: 2026,
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Medali Emas - Olimpiade Sains Pemuda Internasional',
      desc: '3 medali emas di kategori Fisika, Kimia, dan Biologi',
      scope: 'International',
    },
  },
  {
    id: '2',
    year: 2026,
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Juara 1 - MTQ Tingkat Provinsi',
      desc: 'Juara pertama di semua 5 kategori kompetisi Al-Quran tingkat provinsi',
      scope: 'Provincial',
    },
  },
  {
    id: '3',
    year: 2025,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Penghargaan Sekolah Islam Terbaik',
      desc: 'Diakui sebagai Sekolah Islam Terbaik se-Jabodetabek oleh Kementerian Agama',
      scope: 'National',
    },
  },
  {
    id: '4',
    year: 2025,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
    content: {
      title: 'Juara Kompetisi Coding Nasional',
      desc: 'Juara 1 di Kompetisi Coding Nasional Tingkat Junior, mengalahkan 200+ tim',
      scope: 'National',
    },
  },
  {
    id: '5',
    year: 2025,
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop',
    content: {
      title: 'Penghargaan Keunggulan TOEFL',
      desc: 'Rata-rata skor TOEFL tertinggi di antara sekolah berbasis pesantren di Indonesia',
      scope: 'National',
    },
  },
  {
    id: '6',
    year: 2024,
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop',
    content: {
      title: 'Finalis Kompetisi Robotik Internasional',
      desc: '10 besar finalis di Olimpiade Robotik Dunia, mewakili Indonesia',
      scope: 'International',
    },
  },
]
