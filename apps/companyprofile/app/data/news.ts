export interface NewsArticle {
  id: string
  slug: string
  image: string
  category: string
  date: string
  gallery?: string[]
  content: {
    title: string
    excerpt: string
    content: string
    author: string
  }
}

export const newsArticles: NewsArticle[] = [
  {
    id: '1',
    slug: 'gold-medal-international-science-olympiad',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
    category: 'Prestasi',
    date: '2026-05-15',
    gallery: [
      'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop',
    ],
    content: {
      title: 'Siswa Ar-Rahman Raih Emas di Olimpiade Sains Internasional',
      excerpt: 'Siswa berbakat kami membawa pulang 3 medali emas dari Olimpiade Sains Pemuda Internasional di London, bersaing dengan 500+ peserta dari 40 negara.',
      content: `Pesantren Ar-Rahman terus menorehkan prestasi di kancah internasional setelah tiga siswa kami meraih medali emas di Olimpiade Sains Pemuda Internasional (IYSO) yang bergengsi di London, Inggris.

Kompetisi yang diikuti lebih dari 500 siswa dari 40 negara ini menguji peserta dalam bidang fisika, kimia, dan biologi melalui ujian teoritis dan praktik yang ketat.

Peraih medali emas kami — Ahmad Rizki (Fisika), Siti Nurhaliza (Kimia), dan Muhammad Farhan (Biologi) — menunjukkan pengetahuan dan keterampilan pemecahan masalah yang luar biasa selama kompetisi seminggu penuh.

"Persiapannya sangat intens, tetapi guru-guru kami di Ar-Rahman memberikan dukungan yang luar biasa," kata Ahmad Rizki. "Lab robotik dan fasilitas sains sangat membantu kami berlatih secara langsung."

Pimpinan Pesantren, KH. Ahmad Ziyad Khairy, menyatakan kebanggaannya: "Prestasi ini membuktikan bahwa integrasi nilai-nilai Al-Quran dengan pendidikan sains modern menghasilkan lulusan yang kompetitif secara global."

Para pemenang menerima medali mereka dalam upacara yang dihadiri oleh pemimpin pendidikan dari seluruh dunia, dengan duta besar Indonesia untuk Inggris yang menyerahkan penghargaan.`,
      author: 'Tim Media Ar-Rahman',
    },
  },
  {
    id: '2',
    slug: 'annual-cultural-festival-2026',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=2069&auto=format&fit=crop',
    category: 'Acara',
    date: '2026-04-28',
    gallery: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
    ],
    content: {
      title: 'Festival Budaya Tahunan 2026: Perayaan Spektakuler',
      excerpt: 'Ribuan orang berkumpul untuk festival tahunan kami yang menampilkan pertunjukan budaya, pameran seni, dan bazar megah yang menampilkan bakat siswa.',
      content: `Festival Budaya Tahunan Ar-Rahman 2026 sukses besar, menarik ribuan pengunjung dari seluruh wilayah Jabodetabek ke pesantren kami di Bekasi.

Festival tahun ini dengan tema "Unity in Diversity" menampilkan berbagai pertunjukan yang mengesankan termasuk tarian tradisional dari seluruh nusantara, peragaan busana yang menonjolkan modest fashion, dan produksi teater oleh siswa Akademi Kepemimpinan kami.

Pameran seni menampilkan lebih dari 200 karya siswa, mulai dari kaligrafi dan lukisan hingga seni digital dan fotografi. Pengunjung sangat terkesan dengan pameran seni yang dihasilkan AI yang dibuat oleh siswa program Teknologi Digital kami.

Sorotan acara adalah bazar besar, di mana siswa menunjukkan keterampilan kewirausahaan mereka dengan menjual produk mulai dari kerajinan tangan hingga gadget teknologi yang mereka kembangkan sendiri.

"Kami ingin menunjukkan bahwa pendidikan Islam dan ekspresi kreatif berjalan beriringan," kata koordinator festival. "Siswa kami membuktikan bahwa mereka bisa unggul dalam seni, budaya, dan kewirausahaan sambil mempertahankan nilai-nilai Islam mereka."

Festival diakhiri dengan pertunjukan kembang api spektakuler dan lelang amal yang mengumpulkan dana lebih dari Rp 50 juta untuk beasiswa siswa kurang mampu.`,
      author: 'Tim Media Ar-Rahman',
    },
  },
  {
    id: '3',
    slug: 'open-enrollment-2026-2027',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2071&auto=format&fit=crop',
    category: 'Penerimaan',
    date: '2026-04-01',
    content: {
      title: 'Pendaftaran Dibuka Tahun Ajaran 2027/2028',
      excerpt: 'Pendaftaran sekarang dibuka untuk tahun ajaran mendatang. Tempat terbatas di semua program. Pendaftaran awal sangat dianjurkan.',
      content: `Pesantren Tahfidz Qur'an dan Digital Arrahman dengan senang hati mengumumkan bahwa pendaftaran untuk tahun ajaran 2027/2028 sekarang dibuka.

Kami menyambut calon siswa dari tingkat SMP hingga SMA untuk bergabung dengan program-program prestisius kami. Sebagai pesantren premium yang secara unik menggabungkan hafalan Al-Quran dengan pendidikan teknologi digital mutakhir, kami menawarkan pengalaman pendidikan yang tak tertandingi.

Program Tersedia:
- Program Tahfidz Al-Quran (SMP-SMA)
- Program Teknologi Digital (SMP-SMA)
- Program Bilingual (SMP-SMA)
- Akademi Kepemimpinan (SMP-SMA)

Jadwal Pendaftaran:
- Pendaftaran Awal: 1 April - 31 Mei 2027
- Ujian Masuk: 15 Juni 2027
- Wawancara: 20-25 Juni 2027
- Pengumuman: 1 Juli 2027
- Tahun Ajaran Baru: 15 Juli 2027

Kami mendorong orang tua untuk mendaftar lebih awal karena tempat terbatas. Beasiswa tersedia untuk siswa berprestasi.

Untuk informasi lebih lanjut, kunjungi pesantren kami di Rukan Hexa Green Kalimalang, atau hubungi kantor penerimaan kami di nomor yang tercantum di halaman kontak.`,
      author: 'Kantor Penerimaan',
    },
  },
  {
    id: '4',
    slug: 'quran-competition-2026',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=2070&auto=format&fit=crop',
    category: 'Prestasi',
    date: '2026-03-20',
    content: {
      title: 'Siswa Ar-Rahman Dominasi Kompetisi Quran Tingkat Provinsi',
      excerpt: 'Siswa tahfidz kami meraih juara 1 di semua kategori pada Musabaqah Tilawatil Quran Tingkat Provinsi, menunjukkan penguasaan Al-Quran yang luar biasa.',
      content: `Siswa Pesantren Ar-Rahman mencapai prestasi luar biasa pada Musabaqah Tilawatil Quran (MTQ) Tingkat Provinsi 2026, meraih juara pertama di semua kategori kompetisi.

Prestasi ini menunjukkan efektivitas kurikulum tahfidz terpadu kami, yang menggabungkan metode hafalan Al-Quran tradisional dengan pendekatan pedagogis modern.

Pemenang juara pertama:
- Hafalan Quran (30 Juz): Muhammad Al-Fatih
- Tilawah Al-Quran: Ahmad Syakir
- Tafsir Al-Quran: Siti Aisyah
- Kaligrafi Islam: Abdullah Hasan
- Riset Al-Quran: Tim Ar-Rahman

"Program tahfidz kami dirancang tidak hanya untuk hafalan, tetapi untuk pemahaman dan penerapan yang mendalam," kata Ustadz Syamsul Huda, Kepala Program Tahfidz. "Hasil ini mengkonfirmasi bahwa pendekatan kami berhasil."

Para pemenang akan mewakili provinsi di kompetisi MTQ Nasional yang dijadwalkan pada Agustus 2026.`,
      author: 'Tim Media Ar-Rahman',
    },
  },
]
