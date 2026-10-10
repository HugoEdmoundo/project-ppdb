export const REGISTRATION_PATHS = [
  { value: 'reguler', label: 'Reguler' },
  { value: 'prestasi', label: 'Prestasi' },
  { value: 'tahfidz', label: 'Tahfidz' },
  { value: 'rapot', label: 'Rapot' },
]

/**
 * Status alur pendaftar. Daftar ini dipakai bersama oleh form edit dan kolom
 * tabel supaya label yang sama muncul di dua tempat.
 */
export const APPLICANT_STATUSES = [
  { value: 'pending_payment', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Sudah Bayar' },
  { value: 'document_uploaded', label: 'Dokumen Diunggah' },
  { value: 'document_uploaded_pending', label: 'Menunggu Verifikasi Dokumen' },
  { value: 'document_approved', label: 'Dokumen Disetujui' },
  { value: 'document_rejected', label: 'Dokumen Ditolak' },
  { value: 'selection', label: 'Seleksi' },
  { value: 'passed', label: 'Lulus' },
  { value: 'failed', label: 'Tidak Lulus' },
  { value: 'expired', label: 'Kedaluwarsa' },
]

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Belum Bayar' },
  { value: 'paid', label: 'Lunas' },
  { value: 'failed', label: 'Gagal' },
  { value: 'expired', label: 'Kedaluwarsa' },
]
