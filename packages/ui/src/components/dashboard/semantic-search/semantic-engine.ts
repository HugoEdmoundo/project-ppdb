import type { ComponentType } from "react"
import type { DashboardNavGroup, DashboardNavItem } from "../types"

export interface SemanticSearchItem {
  id: string
  title: string
  subtitle?: string
  category: "Navigasi" | "Aksi" | "Pendaftar" | "Pengguna" | "Konten" | "Fasilitas" | "Pengajar" | "Program" | "Prestasi" | "Panduan" | "Lainnya"
  icon?: string | ComponentType<{ className?: string }>
  badge?: string
  url?: string
  onClick?: () => void
  score?: number
  keywords?: string[]
  intentGroup?: string
}

// ── Ontologi Konsep & Sinonim Semantik (Kamus Domain Pesantren & PPDB) ───────
export const SEMANTIC_ONTOLOGY: Record<string, string[]> = {
  santri: ["applicant", "pendaftar", "siswa", "murid", "anak", "peserta", "biodata", "calon santri", "pelajar"],
  pendaftar: ["applicant", "santri", "siswa", "calon", "registrasi", "biodata", "peserta", "formulir"],
  dokumen: ["berkas", "ijazah", "kk", "akta", "nisn", "nik", "foto", "rapor", "upload", "lampiran", "file", "verifikasi"],
  bayar: ["pembayaran", "keuangan", "biaya", "tagihan", "dp", "uang gedung", "spp", "dp3", "qris", "pakasir", "lunas", "transaksi", "cicilan", "kuitansi"],
  tahfidz: ["hafalan", "quran", "juz", "surah", "tajwid", "kelancaran", "simakan", "setoran", "penguji", "tahsin", "makhraj"],
  wawancara: ["interview", "pewawancara", "wali santri", "orang tua", "bk", "tanya jawab", "psikotes", "kesiapan"],
  tiu: ["ujian", "tes", "seb", "safe exam browser", "skor", "nilai", "potensi akademik", "google form", "token tiu", "sync"],
  lulus: ["kelulusan", "hasil", "loa", "letter of acceptance", "skd", "surat keputusan", "diterima", "pengumuman", "lolos"],
  periode: ["gelombang", "kuota", "tahun ajaran", "jadwal", "pembukaan", "tutup", "kapasitas", "wave"],
  pengguna: ["user", "akun", "petugas", "admin", "panitia", "operator", "password", "superadmin", "ganti sandi"],
  role: ["peran", "hak akses", "izin", "kewenangan", "permission", "otorisasi", "privilege", "rbac"],
  whatsapp: ["wa", "pesan", "chat", "broadcast", "notifikasi", "nomor wa", "kirim wa", "gateway", "template"],
  berita: ["artikel", "kabar", "post", "blog", "warta", "publikasi", "liputan", "kegiatan", "tulis artikel"],
  guru: ["ustadz", "ustadzah", "pengajar", "asatidz", "staff", "dewan guru", "kyai", "pendidik", "tenaga"],
  fasilitas: ["gedung", "asrama", "sarana", "masjid", "kelas", "lapangan", "laboratorium", "sarpras", "pondok"],
  program: ["unggulan", "kurikulum", "kegiatan", "ekstrakurikuler", "tahsin", "koding", "kitab kuning"],
  prestasi: ["juara", "piala", "lomba", "kejuaraan", "penghargaan", "medali", "mtq", "mhq"],
  galeri: ["foto", "album", "dokumentasi", "kegiatan", "video", "gambar"],
  testimoni: ["ulasan", "review", "kata mereka", "alumni", "wali santri"],
  arsip: ["dossier", "tahun lalu", "data lama", "zip", "rekap", "riwayat santri"],
  settings: ["pengaturan", "konfigurasi", "logo", "favicon", "kontak", "alamat", "branding", "website"],
}

// ── Tag Semantik Khusus untuk Rute & Menu Dikenal ────────────────────────────
export const ROUTE_SEMANTIC_TAGS: Record<string, { category: SemanticSearchItem["category"]; keywords: string[]; desc: string }> = {
  // PPDB Routes
  "/admin/dashboard": {
    category: "Navigasi",
    keywords: ["ringkasan", "overview", "statistik santri", "rekap ppdb", "grafik", "metrik"],
    desc: "Ringkasan metrik & status pendaftaran santri baru aktif",
  },
  "/admin/data-pendaftar": {
    category: "Navigasi",
    keywords: ["santri", "siswa", "calon", "biodata", "nisn", "nik", "jalur prestasi", "jalur tahfidz", "reguler", "kontak wali"],
    desc: "Daftar lengkap pendaftar periode aktif, biodata, dan status alur",
  },
  "/admin/verifikasi-dokumen": {
    category: "Navigasi",
    keywords: ["berkas", "ijazah", "kk", "akta kelahiran", "kartu keluarga", "pas foto", "approve", "tolak", "cek berkas"],
    desc: "Verifikasi kelayakan berkas persyaratan calon santri",
  },
  "/admin/pembayaran-formulir": {
    category: "Navigasi",
    keywords: ["biaya formulir", "uang masuk", "qris", "pakasir", "transaksi", "kuitansi", "lunas", "invoice"],
    desc: "Monitoring transaksi QRIS pembayaran formulir pendaftaran",
  },
  "/admin/pembayaran-tahap2": {
    category: "Navigasi",
    keywords: ["dp", "uang gedung", "sp3", "cicilan", "termin", "tagihan", "jatuh tempo", "biaya masuk"],
    desc: "Pengaturan dan konfirmasi DP biaya masuk serta skema cicilan",
  },
  "/admin/sessions/tahfidz": {
    category: "Navigasi",
    keywords: ["ujian hafalan", "tes quran", "juz", "surah", "tajwid", "penguji tahfidz", "simakan", "jadwal ujian"],
    desc: "Penjadwalan dan penilaian sesi ujian 1:1 Tahfidz Qur'an",
  },
  "/admin/sessions/wawancara": {
    category: "Navigasi",
    keywords: ["interview", "pewawancara", "wali santri", "orang tua", "kesiapan", "bk", "psikotes", "jadwal wawancara"],
    desc: "Penjadwalan dan penilaian sesi 1:1 wawancara calon santri & wali",
  },
  "/admin/penilaian": {
    category: "Navigasi",
    keywords: ["kelulusan", "skor", "nilai tiu", "hasil seleksi", "ranking", "peringkat", "lolos", "rekapitulasi"],
    desc: "Rekapitulasi gabungan nilai TIU, Tahfidz, Wawancara & penetapan hasil",
  },
  "/admin/review-loa": {
    category: "Navigasi",
    keywords: ["letter of acceptance", "surat penerimaan", "tanda tangan digital", "verifikasi loa", "approval santri"],
    desc: "Review dan verifikasi Surat Penerimaan (LoA) bertanda tangan",
  },
  "/admin/periods": {
    category: "Navigasi",
    keywords: ["periode ppdb", "gelombang pendaftaran", "kuota santri", "buka gelombang", "tutup gelombang", "tahun ajaran"],
    desc: "Manajemen periode akademik tunggal dan gelombang pendaftaran",
  },
  "/admin/pengumuman": {
    category: "Navigasi",
    keywords: ["preview loa", "template skd", "surat keterangan diterima", "wa group santri", "klausul dana"],
    desc: "Pratinjau template LoA resmi, SKD, dan link WhatsApp Group",
  },
  "/admin/rubrik": {
    category: "Navigasi",
    keywords: ["rubrik penilaian", "kriteria tahfidz", "bobot nilai", "standar kelulusan", "passing grade"],
    desc: "Konfigurasi kriteria, bobot, dan formulir evaluator seleksi",
  },
  "/admin/tiu-settings": {
    category: "Navigasi",
    keywords: ["safe exam browser", "seb", "google form tiu", "ujian online", "webhook tiu", "token", "sinkronisasi"],
    desc: "Pengaturan global Safe Exam Browser, Google Form, dan Webhook TIU",
  },
  "/admin/arsip": {
    category: "Navigasi",
    keywords: ["dossier", "arsip pendaftar", "tahun lalu", "download zip", "pencarian cross gelombang", "rekap"],
    desc: "Pencarian dossier lengkap lintas periode & ekspor arsip ZIP",
  },
  "/admin/notifications": {
    category: "Navigasi",
    keywords: ["notifikasi", "pesan sistem", "pemberitahuan", "template pesan", "log notif"],
    desc: "Pusat konfigurasi notifikasi sistem dan template pesan",
  },

  // Superadmin Routes
  "/dashboard": {
    category: "Navigasi",
    keywords: ["overview", "ringkasan", "statistik sistem", "metrik utama", "ikhtisar"],
    desc: "Dashboard kendali terpusat Superadmin seluruh sistem",
  },
  "/applicants": {
    category: "Navigasi",
    keywords: ["pendaftar semua", "santri lintas periode", "data mentah", "filter gelombang", "anomali"],
    desc: "Inspeksi data teknis seluruh pendaftar antar periode dan gelombang",
  },
  "/users": {
    category: "Navigasi",
    keywords: ["pengguna", "kelola akun", "tambah user", "petugas", "reset sandi", "panitia", "aktivasi"],
    desc: "Manajemen seluruh akun pengguna, staf panitia, dan superadmin",
  },
  "/roles": {
    category: "Navigasi",
    keywords: ["peran", "hak akses", "izin", "kewenangan", "rbac", "permissions", "role form"],
    desc: "Konfigurasi peran dan hak akses granular tiap modul sistem",
  },
  "/activities": {
    category: "Navigasi",
    keywords: ["log aktivitas", "audit trail", "rekam jejak", "riwayat perubahan", "siapa ubah apa", "keamanan"],
    desc: "Audit trail rekam jejak aktivitas admin dan perubahan data",
  },
  "/whatsapp": {
    category: "Navigasi",
    keywords: ["broadcast wa", "kirim pesan whatsapp", "status gateway", "qr scan wa", "antrean chat"],
    desc: "Panel pemantauan WhatsApp Gateway internal, siaran pesan, dan log",
  },

  // Company Profile Routes
  "/admin/overview": {
    category: "Navigasi",
    keywords: ["cms overview", "ringkasan website", "pengunjung", "konten"],
    desc: "Ikhtisar konten publik dan statistik portal profil pesantren",
  },
  "/admin/dashboard?tab=news": {
    category: "Konten",
    keywords: ["berita", "artikel", "postingan", "kegiatan santri", "liputan", "tulis berita"],
    desc: "Publikasi warta, berita, dan pengumuman kegiatan pesantren",
  },
  "/admin/dashboard?tab=programs": {
    category: "Program",
    keywords: ["program unggulan", "kurikulum", "tahfidz digital", "koding santri", "kitab kuning"],
    desc: "Pengelolaan program pendidikan dan keunggulan santri",
  },
  "/admin/dashboard?tab=facilities": {
    category: "Fasilitas",
    keywords: ["gedung", "asrama", "masjid", "laboratorium", "sarana", "sarpras", "pondok"],
    desc: "Informasi fasilitas penunjang pendidikan dan asrama pesantren",
  },
  "/admin/dashboard?tab=staff": {
    category: "Pengajar",
    keywords: ["dewan guru", "asatidz", "ustadz", "ustadzah", "pengajar", "pimpinan", "kyai"],
    desc: "Daftar susunan pengajar, asatidz, dan struktur organisasi",
  },
  "/admin/dashboard?tab=achievements": {
    category: "Prestasi",
    keywords: ["juara", "piala", "lomba tahfidz", "mtq", "kejuaraan", "penghargaan", "medali"],
    desc: "Katalog prestasi santri dalam bidang akademik, tahfidz, dan digital",
  },
  "/admin/dashboard?tab=gallery": {
    category: "Konten",
    keywords: ["foto", "album", "dokumentasi", "kegiatan", "video", "galeri santri"],
    desc: "Album foto dan dokumentasi kegiatan resmi pesantren",
  },
  "/admin/dashboard?tab=testimonials": {
    category: "Konten",
    keywords: ["testimoni", "kata alumni", "ulasan orang tua", "review wali santri"],
    desc: "Kutipan dan testimoni alumni serta wali santri",
  },
  "/admin/dashboard?tab=settings": {
    category: "Navigasi",
    keywords: ["pengaturan website", "kontak pesantren", "ganti logo", "favicon", "alamat", "telepon"],
    desc: "Konfigurasi identitas situs, branding, logo, dan kontak resmi",
  },
}

// ── Vektorisasi & Cosine Similarity Math ─────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
}

function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens)
  for (const token of tokens) {
    for (const [concept, syns] of Object.entries(SEMANTIC_ONTOLOGY)) {
      if (token === concept || syns.includes(token)) {
        expanded.add(concept)
        for (const s of syns) expanded.add(s)
      }
    }
  }
  return Array.from(expanded)
}

function computeTermFrequencies(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1)
  }
  return map
}

function cosineSimilarity(tf1: Map<string, number>, tf2: Map<string, number>): number {
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const val of tf1.values()) norm1 += val * val
  for (const val of tf2.values()) norm2 += val * val

  if (norm1 === 0 || norm2 === 0) return 0

  for (const [term, freq1] of tf1.entries()) {
    const freq2 = tf2.get(term) || 0
    dotProduct += freq1 * freq2
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function fuzzyMatch(token: string, targetWords: string[]): boolean {
  if (token.length < 3) return false
  for (const word of targetWords) {
    if (word.length < 3) continue
    const maxDist = token.length <= 4 ? 1 : 2
    if (levenshtein(token, word) <= maxDist) return true
  }
  return false
}

// ── Bangun Index Katalog Navigasi & Aksi Lokal ────────────────────────────────

export function buildLocalSemanticIndex(navGroups: DashboardNavGroup[]): SemanticSearchItem[] {
  const items: SemanticSearchItem[] = []
  const seenUrls = new Set<string>()

  function processItem(item: DashboardNavItem, groupLabel?: string) {
    const targetUrl = item.href || item.key
    if (!targetUrl || seenUrls.has(targetUrl)) return
    seenUrls.add(targetUrl)

    const meta = ROUTE_SEMANTIC_TAGS[targetUrl] || {
      category: "Navigasi",
      keywords: [],
      desc: groupLabel ? `Bagian menu ${groupLabel}` : "Menu navigasi dashboard",
    }

    const keywords = [
      ...tokenize(item.label),
      ...meta.keywords,
      ...(groupLabel ? tokenize(groupLabel) : []),
    ]

    items.push({
      id: `nav-${item.key || targetUrl}`,
      title: item.label,
      subtitle: meta.desc,
      category: meta.category,
      icon: item.icon,
      url: item.href,
      onClick: item.onClick,
      keywords,
    })

    if (item.children) {
      for (const child of item.children) {
        processItem(child, item.label)
      }
    }
  }

  for (const group of navGroups) {
    for (const item of group.items) {
      processItem(item, group.label)
    }
  }

  // Tambahkan aksi cepat umum jika relevan
  items.push(
    {
      id: "action-new-user",
      title: "Tambah Pengguna Baru",
      subtitle: "Buka formulir pembuatan akun admin, petugas, atau operator",
      category: "Aksi",
      url: "/users",
      keywords: ["tambah user", "buat akun", "petugas baru", "operator", "admin baru"],
    },
    {
      id: "action-new-wave",
      title: "Buka Gelombang Pendaftaran Baru",
      subtitle: "Atur tanggal buka, kuota, harga formulir, dan minimal DP",
      category: "Aksi",
      url: "/admin/periods",
      keywords: ["buka gelombang", "gelombang baru", "kuota santri", "tambah wave"],
    },
    {
      id: "action-verify-doc",
      title: "Verifikasi Berkas Pendaftar",
      subtitle: "Periksa berkas KK, Akte, NISN, dan dokumen santri yang pending",
      category: "Aksi",
      url: "/admin/verifikasi-dokumen",
      keywords: ["verifikasi berkas", "cek dokumen", "ijazah santri", "persetujuan dokumen"],
    },
    {
      id: "action-new-article",
      title: "Tulis Artikel / Berita Baru",
      subtitle: "Publikasikan warta kegiatan pesantren ke company profile",
      category: "Aksi",
      url: "/admin/dashboard?tab=news",
      keywords: ["tulis berita", "buat artikel baru", "posting kabar", "publikasi cms"],
    },
    {
      id: "action-broadcast-wa",
      title: "Kirim Siaran WhatsApp",
      subtitle: "Kirim notifikasi atau pengumuman massal ke wali santri",
      category: "Aksi",
      url: "/whatsapp",
      keywords: ["broadcast wa", "kirim pesan wa", "pesan massal", "notifikasi whatsapp"],
    }
  )

  return items
}

// ── Semantic Search Algorithm ────────────────────────────────────────────────

export function searchSemanticCatalog(
  query: string,
  catalog: SemanticSearchItem[]
): SemanticSearchItem[] {
  const cleanQ = query.trim().toLowerCase()
  if (!cleanQ) return []

  const queryTokens = tokenize(cleanQ)
  const expandedTokens = expandQueryTokens(queryTokens)
  const queryTf = computeTermFrequencies(expandedTokens)

  const scored: SemanticSearchItem[] = []

  for (const item of catalog) {
    const itemTokens = [
      ...tokenize(item.title),
      ...(item.subtitle ? tokenize(item.subtitle) : []),
      ...(item.keywords || []),
      item.category.toLowerCase(),
    ]

    const itemTf = computeTermFrequencies(itemTokens)
    const cosScore = cosineSimilarity(queryTf, itemTf)

    let boost = 0
    const lowerTitle = item.title.toLowerCase()
    const lowerSub = (item.subtitle || "").toLowerCase()

    // Exact phrase match boost
    if (lowerTitle.includes(cleanQ)) {
      boost += 0.4
    } else if (lowerSub.includes(cleanQ)) {
      boost += 0.25
    }

    // Token startswith boost
    for (const qTok of queryTokens) {
      if (itemTokens.some((t) => t.startsWith(qTok))) {
        boost += 0.15
      }
    }

    // Typo tolerance fuzzy match
    for (const qTok of queryTokens) {
      if (fuzzyMatch(qTok, itemTokens)) {
        boost += 0.1
      }
    }

    const finalScore = Math.min(cosScore + boost, 1.0)

    if (finalScore >= 0.25) {
      scored.push({
        ...item,
        score: Math.round(finalScore * 100),
      })
    }
  }

  // Sort by score descending
  return scored.sort((a, b) => (b.score || 0) - (a.score || 0))
}

// ── Fetch Server-Side Live Semantic Data ─────────────────────────────────────

export async function fetchLiveSemanticResults(
  query: string,
  apiBase = ""
): Promise<SemanticSearchItem[]> {
  const cleanQ = query.trim()
  if (cleanQ.length < 2) return []

  const baseUrl = apiBase.replace(/\/+$/, "")
  const endpoint = `${baseUrl}/search/semantic?q=${encodeURIComponent(cleanQ)}&limit=15`

  try {
    const res = await fetch(endpoint, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })

    if (!res.ok) return []

    const data = await res.json()
    if (!data || !Array.isArray(data.results)) return []

    return data.results.map((r: any): SemanticSearchItem => ({
      id: r.id || String(Math.random()),
      title: r.title || "Tanpa Judul",
      subtitle: r.subtitle || "",
      category: (r.category as any) || "Lainnya",
      badge: r.badge,
      url: r.url,
      score: r.score ? Math.round(r.score * 100) : 80,
    }))
  } catch {
    return []
  }
}
