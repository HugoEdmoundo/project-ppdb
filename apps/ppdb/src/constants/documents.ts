export interface DocumentSpec {
  name: string
  description: string
  required: boolean
  category: 'wajib' | 'tambahan'
}

export const BASE_DOCUMENTS: DocumentSpec[] = [
  { name: 'NISN', description: 'Kartu atau bukti cetak NISN resmi.', required: true, category: 'wajib' },
  { name: 'Kartu Keluarga (KK)', description: 'Bukti susunan keluarga dan NIK.', required: true, category: 'wajib' },
  { name: 'Akta Kelahiran', description: 'Bukti kelahiran calon santri/siswa.', required: true, category: 'wajib' },
  { name: 'Pas Foto', description: 'Pas foto terbaru calon siswa (3x4 atau 4x6).', required: true, category: 'wajib' }
]

export const TIU_DOCUMENTS: DocumentSpec[] = [...BASE_DOCUMENTS]

export const PRESTASI_DOCUMENTS: DocumentSpec[] = [
  ...BASE_DOCUMENTS,
  { name: 'Sertifikat Prestasi 1', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi (Wajib ke-1).', required: true, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 2', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi (Wajib ke-2).', required: true, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 3', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi (Wajib ke-3, syarat minimal 3 sertifikat).', required: true, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 4', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 5', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 6', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 7', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 8', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 9', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional).', required: false, category: 'tambahan' },
  { name: 'Sertifikat Prestasi 10', description: 'Sertifikat / Piagam Kejuaraan atau Prestasi tambahan (Opsional, batas maksimal 10 sertifikat).', required: false, category: 'tambahan' },
]

export const RAPOT_DOCUMENTS: DocumentSpec[] = [
  ...BASE_DOCUMENTS,
  { name: 'Rapor Semester 1', description: 'Scan/foto rapor semester ke-1 dari 4 semester terakhir.', required: true, category: 'tambahan' },
  { name: 'Rapor Semester 2', description: 'Scan/foto rapor semester ke-2 dari 4 semester terakhir.', required: true, category: 'tambahan' },
  { name: 'Rapor Semester 3', description: 'Scan/foto rapor semester ke-3 dari 4 semester terakhir.', required: true, category: 'tambahan' },
  { name: 'Rapor Semester 4', description: 'Scan/foto rapor semester ke-4 dari 4 semester terakhir.', required: true, category: 'tambahan' }
]

export const TAHFIDZ_DOCUMENTS: DocumentSpec[] = [
  ...BASE_DOCUMENTS,
  { name: 'Surat Pengakuan Hafalan 1', description: 'Surat Keterangan / Piagam Pengakuan Hafalan resmi dari lembaga/orang tua (Wajib minimal 1). Utamakan surat pengakuan hafalan resmi, bukan file video.', required: true, category: 'tambahan' },
  { name: 'Surat Pengakuan Hafalan 2', description: 'Surat Keterangan / Piagam Pengakuan Hafalan tambahan (Opsional, max 3).', required: false, category: 'tambahan' },
  { name: 'Surat Pengakuan Hafalan 3', description: 'Surat Keterangan / Piagam Pengakuan Hafalan tambahan (Opsional, max 3).', required: false, category: 'tambahan' }
]

export function getDocumentsForPath(path?: string | null): DocumentSpec[] {
  const p = (path || '').toLowerCase()
  if (p.includes('prestasi')) return PRESTASI_DOCUMENTS
  if (p.includes('rapot') || p.includes('rapor') || p.includes('pindahan')) return RAPOT_DOCUMENTS
  if (p.includes('tahfidz')) return TAHFIDZ_DOCUMENTS
  return TIU_DOCUMENTS
}

export const NON_TIU_DOCUMENTS = PRESTASI_DOCUMENTS
export const REQUIRED_DOCUMENTS = TIU_DOCUMENTS
