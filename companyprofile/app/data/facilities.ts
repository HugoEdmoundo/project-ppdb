export type FacilityCategory = 'academic' | 'worship' | 'sports' | 'boarding' | 'tech' | 'arts'

export interface Facility {
  id: string
  image: string
  category: FacilityCategory
  content: {
    name: string
    desc: string
    features: string[]
  }
}

export const facilities: Facility[] = [
  {
    id: 'lab-komputer',
    category: 'tech',
    image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop',
    content: {
      name: 'Lab Komputer',
      desc: 'Laboratorium komputer canggih dengan workstation berkinerja tinggi untuk coding, AI, dan desain digital.',
      features: ['50+ PC High-end', 'VR Development Kit', 'Printer 3D', 'Ruang Server'],
    },
  },
  {
    id: 'lab-sains',
    category: 'academic',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop',
    content: {
      name: 'Lab Sains',
      desc: 'Laboratorium sains lengkap untuk eksperimen fisika, kimia, dan biologi dengan peralatan modern.',
      features: ['Lab Fisika', 'Lab Kimia', 'Lab Biologi', 'Ruang Mikroskopi'],
    },
  },
  {
    id: 'perpustakaan',
    category: 'academic',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=2070&auto=format&fit=crop',
    content: {
      name: 'Perpustakaan Digital',
      desc: 'Perpustakaan modern dengan koleksi buku, jurnal, dan sumber daya digital yang luas untuk penelitian dan pembelajaran.',
      features: ['50,000+ Buku', 'Arsip Digital', 'Portal E-Library', 'Ruang Belajar'],
    },
  },
  {
    id: 'masjid',
    category: 'worship',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070&auto=format&fit=crop',
    content: {
      name: 'Masjid',
      desc: 'Masjid luas untuk shalat harian, studi Al-Quran, dan aktivitas Islam dengan kapasitas 1,000+ jamaah.',
      features: ['Kapasitas 1,000+', 'AC & Sound System', 'Area Wudhu', 'Perpustakaan Islami'],
    },
  },
  {
    id: 'olahraga',
    category: 'sports',
    image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=2075&auto=format&fit=crop',
    content: {
      name: 'Kompleks Olahraga',
      desc: 'Kompleks olahraga standar Olimpiade dengan berbagai venue untuk aktivitas atletik dan kompetisi.',
      features: ['Lapangan Sepak Bola', 'Lapangan Basket', 'Kolam Renang', 'Lapangan Futsal'],
    },
  },
  {
    id: 'aula',
    category: 'academic',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop',
    content: {
      name: 'Auditorium',
      desc: 'Auditorium megah berkapasitas 800 kursi untuk acara akademik, seminar, dan produksi seni pertunjukan.',
      features: ['800 Kursi', 'Panggung Profesional', 'Layar LED', 'Sistem Akustik'],
    },
  },
  {
    id: 'asrama',
    category: 'boarding',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=2069&auto=format&fit=crop',
    content: {
      name: 'Asrama',
      desc: 'Fasilitas asrama yang nyaman dan aman dengan pengawasan 24/7, ruang belajar, dan area rekreasi.',
      features: ['Kamar Ber-AC', 'Ruang Belajar', 'Kantin', 'Keamanan 24/7'],
    },
  },
  {
    id: 'seni',
    category: 'arts',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop',
    content: {
      name: 'Studio Seni & Musik',
      desc: 'Ruang kreatif yang dilengkapi untuk seni visual, musik, dan seni pertunjukan untuk mengembangkan bakat kreatif siswa.',
      features: ['Studio Musik', 'Galeri Seni', 'Studio Tari', 'Latihan Band'],
    },
  },
]
