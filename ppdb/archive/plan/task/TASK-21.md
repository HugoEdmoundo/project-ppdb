> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-21: Frontend â€” MOU, Acceptance & Re-registration Pages>

## Info

| Item | Value |
|------|-------|
| Phase | 7 â€” Post-Seleksi & Penerimaan |
| Priority | ðŸŸ¢ Medium |
| Estimasi | 3-4 hari |
| Dependencies | TASK-20 |

## Deskripsi

Membuat halaman-halaman frontend untuk proses pasca-seleksi meliputi: manajemen template MOU oleh admin, generate dan review MOU, halaman download dan upload MOU untuk applicant, manajemen surat penerimaan (acceptance letter) termasuk batch generation, manajemen jadwal registrasi ulang beserta tracking kehadiran, manajemen jadwal MPLS, serta halaman informasi untuk applicant terkait surat penerimaan, jadwal registrasi ulang, dan info MPLS.

## Scope

### Frontend (UI)

#### Admin â€” MOU Management
- **Halaman Template MOU** (`/admin/mou/templates`)
  - Tabel list template MOU (nama, versi, status aktif, tanggal dibuat)
  - Form tambah/edit template MOU (nama, upload file template, versi)
  - Tombol aktif/nonaktifkan template
  - Tombol hapus template dengan konfirmasi dialog
- **Halaman MOU Pendaftar** (`/admin/mou/applicants`)
  - Tabel list MOU pendaftar dengan filter: status (generated/uploaded/approved/rejected), gelombang, jenjang
  - Tombol generate MOU per applicant (pilih template â†’ generate)
  - Tombol batch generate MOU untuk multiple applicants
  - Detail view MOU: preview file generated, preview file uploaded (signed)
  - Action buttons: approve, reject (dengan modal input alasan penolakan)
  - Badge status berwarna: generated (blue), uploaded (yellow), approved (green), rejected (red)

#### Admin â€” Acceptance Letters
- **Halaman Surat Penerimaan** (`/admin/acceptance-letters`)
  - Tabel list surat penerimaan (nomor dokumen, nama pendaftar, tanggal generate)
  - Filter: gelombang, jenjang, tanggal
  - Tombol generate individual: pilih applicant â†’ generate
  - Tombol batch generate: auto-generate untuk semua applicant yang eligible (lulus + payment complete)
  - Confirmation dialog sebelum batch generate dengan preview jumlah applicant eligible
  - Download individual dan download batch (ZIP)

#### Admin â€” Re-registration
- **Halaman Registrasi Ulang** (`/admin/re-registration`)
  - Tabel jadwal registrasi ulang (nama pendaftar, tanggal jadwal, status kehadiran)
  - Filter: status (scheduled/attended/missed), tanggal, gelombang
  - Form buat/edit jadwal registrasi ulang per applicant
  - Tombol catat kehadiran (attended) dengan timestamp
  - Tombol tandai missed untuk yang tidak hadir
  - Summary cards: total scheduled, attended, missed

#### Admin â€” MPLS Management
- **Halaman Jadwal MPLS** (`/admin/mpls`)
  - Tabel list jadwal MPLS (judul, tanggal mulai, tanggal selesai, jumlah peserta)
  - Form CRUD jadwal MPLS (judul, tanggal mulai, tanggal selesai, deskripsi)
  - Tab/section: Detail Jadwal | Daftar Peserta
  - Assign applicant ke jadwal MPLS (search applicant â†’ assign)
  - Batch assign: pilih multiple applicants â†’ assign ke jadwal
  - Unassign applicant dari jadwal

#### Applicant â€” MOU
- **Halaman MOU Saya** (`/applicant/mou`)
  - Status card MOU saat ini (generated/uploaded/approved/rejected)
  - Tombol download MOU (file yang di-generate)
  - Form upload MOU yang sudah ditandatangani (drag & drop, max 5MB, PDF only)
  - Progress upload indicator
  - Status approval: pending review / approved / rejected (dengan alasan jika ditolak)
  - Re-upload jika rejected

#### Applicant â€” Acceptance & Registration Info
- **Halaman Surat Penerimaan** (`/applicant/acceptance-letter`)
  - Card surat penerimaan dengan nomor dokumen
  - Tombol download surat penerimaan (PDF)
  - Pesan jika belum tersedia (menunggu proses)
- **Halaman Registrasi Ulang** (`/applicant/re-registration`)
  - Info jadwal registrasi ulang (tanggal, waktu, lokasi)
  - Status kehadiran
  - Countdown timer menuju tanggal registrasi ulang
- **Halaman Info MPLS** (`/applicant/mpls`)
  - Detail jadwal MPLS yang ditugaskan (judul, tanggal, deskripsi)
  - Status jika belum di-assign

### Database

- Menggunakan tabel dari TASK-20: `mou_templates`, `applicant_mous`, `acceptance_letters`, `re_registrations`, `mpls_schedules`, `applicant_mpls`

## Acceptance Criteria

- [ ] Admin dapat melakukan CRUD template MOU melalui UI
- [ ] Admin dapat generate MOU per applicant dan secara batch
- [ ] Admin dapat melihat preview file MOU (generated dan uploaded)
- [ ] Admin dapat approve/reject MOU dengan alasan penolakan
- [ ] Badge status MOU tampil dengan warna yang sesuai
- [ ] Admin dapat generate surat penerimaan individual dan batch
- [ ] Batch generate menampilkan confirmation dialog dengan jumlah eligible applicants
- [ ] Admin dapat mengelola jadwal registrasi ulang dan mencatat kehadiran
- [ ] Summary cards registrasi ulang menampilkan data yang akurat
- [ ] Admin dapat CRUD jadwal MPLS dan assign/unassign applicants
- [ ] Applicant dapat download MOU dan upload MOU yang ditandatangani
- [ ] Upload MOU memvalidasi tipe file (PDF) dan ukuran (max 5MB)
- [ ] Applicant dapat melihat status approval MOU
- [ ] Applicant dapat melihat dan download surat penerimaan
- [ ] Applicant dapat melihat jadwal registrasi ulang dan status kehadiran
- [ ] Applicant dapat melihat info MPLS yang ditugaskan
- [ ] Semua halaman responsif (mobile, tablet, desktop)
- [ ] Loading states dan error states ditangani dengan baik
- [ ] Empty states menampilkan pesan yang informatif

## Technical Notes

- Gunakan `react-dropzone` atau komponen serupa untuk fitur upload drag & drop
- Untuk preview file PDF, gunakan `react-pdf` atau embed PDF viewer
- Batch generate acceptance letter bisa memakan waktu lama, pertimbangkan menggunakan progress bar atau background job notification
- Countdown timer pada halaman registrasi ulang menggunakan interval-based update
- Gunakan `useSWR` atau `react-query` untuk data fetching dan cache management
- Filter pada tabel admin menggunakan URL search params agar shareable
- Konfirmasi dialog untuk aksi destructive (delete, reject) wajib ada
- Untuk halaman applicant, tampilkan stepper/timeline yang menunjukkan posisi mereka dalam proses pasca-seleksi

</TASK-21: Frontend â€” MOU, Acceptance & Re-registration Pages>

