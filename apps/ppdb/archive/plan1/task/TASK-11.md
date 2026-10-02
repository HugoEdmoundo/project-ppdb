> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-11: Frontend â€” Applicant Dashboard & Profile>

## Info

| Item | Value |
|------|-------|
| Phase | Phase 3 â€” Applicant Management |
| Priority | ðŸŸ¡ High |
| Estimasi | 2-3 hari |
| Dependencies | TASK-02 (Auth & RBAC), TASK-08 (API Applicant Registration) |

## Deskripsi

Membangun halaman dashboard utama untuk pendaftar (applicant) setelah login. Dashboard ini menjadi pusat informasi bagi calon siswa/orang tua untuk memantau seluruh proses PPDB mereka â€” mulai dari status pendaftaran, kelengkapan dokumen, jadwal tes, hingga pembayaran. Halaman ini juga mencakup form edit profil dan data orang tua.

## Scope

### Frontend (UI)

#### 1. Applicant Dashboard (`/dashboard`)
- **Status Timeline / Progress Tracker**
  - Visual stepper horizontal atau vertical yang menunjukkan tahapan PPDB:
    1. Pendaftaran â†’ 2. Upload Dokumen â†’ 3. Verifikasi â†’ 4. Pembayaran â†’ 5. Tes Seleksi â†’ 6. Pengumuman
  - Setiap step menampilkan: icon, label, status (completed/active/pending/failed), tanggal selesai
  - Step aktif di-highlight, step selesai diberi checkmark hijau
  - Klik pada step mengarahkan ke halaman terkait

- **Summary Cards Row**
  - Card: Status Pendaftaran (badge warna sesuai status)
  - Card: Kelengkapan Dokumen (progress bar, misal "3/5 dokumen lengkap")
  - Card: Status Pembayaran (total tagihan, sudah dibayar, sisa)
  - Card: Jadwal Tes Terdekat (tanggal, jenis tes, lokasi)

- **Notification List**
  - Daftar notifikasi terbaru (5-10 terakhir)
  - Format: icon + judul + deskripsi singkat + waktu relatif (misal "2 jam lalu")
  - Badge unread count di header
  - Link "Lihat Semua" ke halaman notifikasi penuh
  - Tipe notifikasi: info, warning, success, error â€” masing-masing dengan warna berbeda

- **Document Checklist Widget**
  - Daftar dokumen wajib dan opsional
  - Status per dokumen: belum upload, pending review, approved âœ…, rejected âŒ, revision ðŸ”„
  - Quick action: tombol "Upload" untuk yang belum upload, "Re-upload" untuk yang revision
  - Link ke halaman dokumen lengkap

- **Payment Summary Widget**
  - Ringkasan invoice aktif
  - Total tagihan, sudah dibayar, sisa pembayaran
  - Tanggal jatuh tempo terdekat
  - Tombol "Bayar Sekarang" jika ada tagihan pending
  - Link ke halaman pembayaran lengkap

#### 2. Profile Page (`/dashboard/profile`)
- **Profile View Mode**
  - Menampilkan data lengkap pendaftar dalam format read-only
  - Sections: Data Pribadi, Data Akademik, Data Orang Tua/Wali
  - Foto profil dengan initial avatar fallback
  - Tombol "Edit Profil"

- **Profile Edit Form**
  - Form edit data pribadi pendaftar:
    - Nama lengkap, tempat/tanggal lahir, jenis kelamin
    - NIK, NISN
    - Alamat lengkap (provinsi, kota, kecamatan, kelurahan, RT/RW, kode pos)
    - Nomor HP, email
    - Asal sekolah, tahun lulus
    - Ukuran seragam
  - Validasi form client-side (required fields, format NIK 16 digit, format NISN, email valid)
  - Tombol Simpan dengan loading state
  - Toast notification sukses/gagal
  - Prevent edit jika status sudah melewati tahap tertentu (misal sudah diterima)

#### 3. Parents Data Page (`/dashboard/parents`)
- **Parents View Mode**
  - Data Ayah: nama, NIK, pekerjaan, pendidikan, penghasilan, nomor HP
  - Data Ibu: nama, NIK, pekerjaan, pendidikan, penghasilan, nomor HP
  - Data Wali (opsional): nama, NIK, hubungan, pekerjaan, nomor HP

- **Parents Edit Form**
  - Form terpisah untuk Ayah, Ibu, dan Wali (tab atau accordion)
  - Field: nama lengkap, NIK, tempat/tanggal lahir, pendidikan terakhir (dropdown), pekerjaan, penghasilan (range dropdown), nomor HP, email
  - Validasi: NIK 16 digit, nomor HP format Indonesia
  - Toggle "Wali sama dengan Ayah/Ibu" untuk auto-fill

#### 4. Status History (`/dashboard/history`)
- **Timeline Vertikal**
  - Menampilkan seluruh riwayat perubahan status pendaftaran
  - Setiap entry: tanggal/waktu, status lama â†’ status baru, keterangan, aktor (sistem/admin)
  - Warna berbeda per jenis status
  - Sorted descending (terbaru di atas)

### Components yang Dibutuhkan

| Component | Deskripsi |
|-----------|-----------|
| `StepTimeline` | Reusable progress stepper horizontal/vertical |
| `SummaryCard` | Card ringkasan dengan icon, value, dan label |
| `NotificationItem` | Item notifikasi dengan icon tipe, waktu relatif |
| `DocumentChecklistItem` | Item dokumen dengan status badge dan action button |
| `PaymentSummaryCard` | Card ringkasan pembayaran dengan progress |
| `ProfileForm` | Form edit profil dengan validasi |
| `ParentsForm` | Form edit data orang tua dengan tabs |
| `StatusTimeline` | Timeline vertikal riwayat status |
| `StatusBadge` | Badge status dengan warna dinamis |

### API Endpoints yang Digunakan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/applicants/me` | Data profil pendaftar |
| PUT | `/api/v1/applicants/me` | Update profil pendaftar |
| GET | `/api/v1/applicants/me/parents` | Data orang tua |
| PUT | `/api/v1/applicants/me/parents` | Update data orang tua |
| GET | `/api/v1/applicants/me/status-history` | Riwayat status |
| GET | `/api/v1/applicants/me/documents` | Checklist dokumen |
| GET | `/api/v1/applicants/me/invoices` | Ringkasan pembayaran |
| GET | `/api/v1/applicants/me/notifications` | Daftar notifikasi |
| PUT | `/api/v1/notifications/:id/read` | Tandai notifikasi dibaca |

### Database

- `applicants` â€” data profil pendaftar
- `applicant_parents` â€” data orang tua/wali
- `applicant_status_history` â€” riwayat perubahan status
- `applicant_documents` â€” status dokumen
- `invoices` â€” data tagihan
- `notifications` â€” notifikasi pengguna

## Acceptance Criteria

- [ ] Dashboard menampilkan progress timeline PPDB yang akurat sesuai status pendaftar saat ini
- [ ] Summary cards menampilkan data real-time (status, dokumen, pembayaran, tes)
- [ ] Notification list menampilkan 5-10 notifikasi terbaru dengan badge unread count
- [ ] Document checklist menampilkan semua dokumen wajib dengan status masing-masing
- [ ] Payment summary menampilkan total tagihan dan sisa pembayaran
- [ ] Profil dapat dilihat dalam mode read-only dan diedit melalui form
- [ ] Validasi form profil berjalan sesuai aturan (NIK, NISN, email, required fields)
- [ ] Data orang tua (Ayah, Ibu, Wali) dapat dilihat dan diedit
- [ ] Status history menampilkan timeline perubahan status secara kronologis
- [ ] Semua halaman responsive (mobile, tablet, desktop)
- [ ] Loading skeleton ditampilkan saat fetch data
- [ ] Error state ditampilkan dengan pesan yang jelas jika API gagal
- [ ] Toast notification muncul setelah berhasil/gagal menyimpan data

## Technical Notes

- Gunakan React Query (`@tanstack/react-query`) untuk data fetching dan caching
- Gunakan React Hook Form + Zod untuk form validation
- StepTimeline component buat reusable agar bisa dipakai di halaman lain
- Untuk status badge, buat mapping warna:
  ```typescript
  const statusColorMap: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-800',
    document_review: 'bg-yellow-100 text-yellow-800',
    payment_pending: 'bg-orange-100 text-orange-800',
    test_scheduled: 'bg-purple-100 text-purple-800',
    passed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  ```
- Waktu relatif gunakan library `date-fns` (`formatDistanceToNow`)
- Untuk initial avatar, generate dari 2 huruf pertama nama
- Implement optimistic update pada form edit agar UX lebih responsif
- Gunakan `Suspense` boundary untuk lazy loading section yang berat
- Mobile: summary cards stack vertikal, timeline horizontal scroll

</TASK-11: Frontend â€” Applicant Dashboard & Profile>
