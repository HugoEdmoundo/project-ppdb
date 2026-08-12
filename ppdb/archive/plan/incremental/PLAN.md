> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# Rencana Pengerjaan PPDB Secara Inkremental

## Status Saat Ini

| Layer | Progress |
|-------|----------|
| Database & Migrations | ~95% |
| Backend API | ~90% (semua endpoint tertulis, 85% mounted) |
| Frontend UI | ~15% (5 halaman fungsional dari ~36 rute) |
| Frontend Infrastruktur | ~90% (auth, layout, services, UI components, routing) |

## Bug Kritis

**`post.routes.ts` tidak di-mount di `app.ts`** â€” 24 endpoint MOU/acceptance/re-registration/MPLS tertulis tapi tidak bisa diakses.

---

## Pendekatan

Bangun secara inkremental per fase, fokus ke frontend UI yang belum ada. Backend API sudah hampir lengkap, jadi sebagian besar pekerjaan adalah membangun halaman admin dan applicant yang masih placeholder.

Pola yang akan diikuti:
- Data fetching: `useState` + `useEffect` â†’ service function â†’ toast on error
- Loading: `<Spinner />` atau skeleton `animate-pulse`
- UI: komponen dari `src/components/ui/` (Button, Input, Card, Modal, dll.)
- Form: controlled inputs dengan spread update
- Route: ganti `<P title="..." />` dengan komponen halaman asli

---

## Fase 0 â€” Bug Fix âœ…

### Fix: Mount post.routes.ts
- **File**: `backend.ptdarrahman/src/app.ts`
- **Aksi**: Tambahkan `app.route('/post', postRoutes)` setelah import `postRoutes`
- **Note**: `postRoutes` sudah di-import tapi tidak digunakan

---

## Fase 1 â€” PPDB Configuration UI âœ…

Backend API untuk periods, waves, levels, categories, flows, wave-configs sudah lengkap. Yang perlu dibangun: halaman admin untuk mengelola semua konfigurasi ini.

### Halaman yang dibangun:

1. **Manajemen Periode & Gelombang** (`/admin/periods`)
   - Tabel CRUD untuk periods dengan kolom: nama, tahun ajaran, tanggal mulai/selesai, status, aksi
   - Tabel CRUD untuk waves dengan kolom: nama, periode, urutan, tanggal mulai/selesai, kuota, status
   - Modal form untuk create/edit dengan validasi
   - Konfirmasi dialog untuk delete

2. **Manajemen Jenjang & Kategori** (`/admin/levels`)
   - Tabel CRUD untuk levels (jenjang: TK, SD, SMP, SMA)
   - Tabel CRUD untuk categories (kategori dalam jenjang: Reguler, Unggulan, dll.)
   - Tabel CRUD untuk flows (alur seleksi: tahapan-tahapan)

3. **Konfigurasi Gelombang** (`/admin/wave-config`)
   - Tabel yang memetakan Wave + Level + Category + Flow
   - Form dengan Select dropdown untuk memilih wave, level, category, flow
   - Tampilkan relasi yang sudah dikonfigurasi

### Service yang digunakan:
- `ppdbService.periods.get/create/update/delete`
- `ppdbService.waves.get/create/update/delete`
- `ppdbService.levels.get/create/update/delete`
- `ppdbService.categories.get/create/update/delete`
- `ppdbService.flows.get/create/update/delete`
- `ppdbService.waveConfigs.get/create/update/delete`

### File yang diubah:
- `ppdb.ptdarrahman.sch.id/src/App.tsx` â€” ganti placeholder routes
- `ppdb.ptdarrahman.sch.id/src/pages/admin/PeriodsPage.tsx` (baru)
- `ppdb.ptdarrahman.sch.id/src/pages/admin/LevelsPage.tsx` (baru)
- `ppdb.ptdarrahman.sch.id/src/pages/admin/WaveConfigPage.tsx` (baru)
- `ppdb.ptdarrahman.sch.id/src/services/index.ts` â€” tambah ppdbService
- `ppdb.ptdarrahman.sch.id/src/layouts/AdminLayout.tsx` â€” update sidebar

---

## Fase 2 â€” Applicant Profile & Registration (TASK-09, TASK-11, ~3-4 hari)

Backend API untuk applicant profile, parents, status history sudah ada. Yang perlu dibangun:

1. **Profil Pendaftar** (`/applicant/profile`)
   - View mode read-only dengan seksi: Data Pribadi, Data Akademik
   - Edit mode dengan form
   - Lock edit jika status sudah lewat tahap tertentu

2. **Data Orang Tua** (`/applicant/parents`)
   - Tabs: Ayah, Ibu, Wali
   - Form per tab dengan field lengkap
   - Toggle "Wali sama dengan Ayah/Ibu"

3. **Status History** (`/applicant/history`)
   - Timeline vertikal perubahan status
   - Warna per status, descending terbaru

### Service yang digunakan:
- `applicantService.getMyApplication`, `applicantService.updateProfile`
- `applicantService.getParents`, `applicantService.saveParent`
- `applicantService.getStatusHistory`

---

## Fase 3 â€” Document Admin Review UI (TASK-13 admin side, ~2-3 hari)

Applicant side (`ApplicantDocumentsPage`) sudah selesai. Yang perlu: halaman admin untuk review dokumen.

1. **Review Queue** (`/admin/documents`)
   - Tabel dengan filter: status, level, wave
   - FIFO ordering (terlama dulu)
   - Aksi: approve, reject, request revision (dengan modal catatan)
   - Statistik cards: pending, approved, rejected, revision

### Service yang digunakan:
- `documentService.getReviewQueue`, `documentService.reviewDocument`

---

## Fase 4 â€” Payment UI (TASK-16, ~3-4 hari)

Backend API untuk payment stages, invoices, transactions, discounts, installments sudah lengkap.

1. **Invoice & Pembayaran Applicant** (`/applicant/payments`)
   - Daftar invoice dengan status badge
   - Detail invoice + riwayat transaksi
   - Upload bukti pembayaran (FormData)
   - Info cicilan & diskon

2. **Manajemen Pembayaran Admin** (`/admin/payments`)
   - Dashboard pembayaran
   - Manajemen invoice (create, edit, cancel)
   - Verifikasi transaksi (approve/reject bukti bayar)
   - Manajemen diskon (CRUD kode diskon)
   - Manajemen cicilan

### Service yang digunakan:
- `paymentService.*` (semua sudah terdefinisi di service layer)

---

## Fase 5 â€” Selection & Testing UI (TASK-19, ~3-4 hari)

1. **Admin â€” Manajemen Tes** (`/admin/tests`)
   - CRUD test types
   - Parameter tes (bobot, nilai min/max/lulus)
   - Jadwal sesi tes (tanggal, waktu, lokasi, kapasitas)
   - Assign peserta ke sesi (individu + batch)
   - Tracking kehadiran

2. **Input Nilai** (`/admin/scores`)
   - Form input nilai per peserta per parameter
   - Kalkulasi otomatis (rata-rata terbobot)
   - Penentuan lulus/tidak

3. **Applicant â€” Hasil Tes** (`/applicant/tests`)
   - Lihat jadwal tes
   - Lihat hasil & status kelulusan

### Service yang digunakan:
- `selectionService.*`

---

## Fase 6 â€” MOU & Post-Selection UI (TASK-21, ~3-4 hari)

1. **Admin â€” MOU Management** (`/admin/mou`)
   - CRUD template MOU + upload file DOCX
   - Generate MOU per peserta / batch
   - Review MOU yang sudah ditandatangani
   - Status badges: generated/uploaded/approved/rejected

2. **Admin â€” Surat Penerimaan** (`/admin/acceptance`)
   - Generate individu + batch
   - Download individu + ZIP

3. **Admin â€” Daftar Ulang** (`/admin/re-registration`)
   - Jadwal & tracking kehadiran
   - Summary cards

4. **Admin â€” MPLS** (`/admin/mpls`)
   - CRUD jadwal + assign peserta

5. **Applicant Side:**
   - MOU: download, upload signed, lihat status
   - Surat Penerimaan: download
   - Daftar Ulang: info jadwal + countdown timer
   - MPLS: info jadwal

### Service yang digunakan:
- `postService.*` (setelah postRoutes di-mount)

---

## Fase 7 â€” Notifications & Calendar UI (TASK-24, ~2-3 hari)

1. **Admin â€” Notifikasi** (`/admin/notifications`)
   - CRUD template notifikasi
   - Kirim individu + bulk
   - Log & status tracking

2. **Applicant â€” Inbox** (`/applicant/notifications`)
   - Daftar notifikasi dengan read/unread
   - Mark as read

3. **Kalender Akademik** (`/info/calendar`)
   - Tampilan kalender publik

---

## Fase 8 â€” Dashboard Enhancement (TASK-27, ~2-3 hari)

Dashboard role-specific (superadmin, admin seleksi, admin keuangan, penguji). `AdminDashboardPage` sudah ada tapi masih read-only stats dari `dashboardService.getStats()`.

---

## Fase 9 â€” Reports & Export (TASK-26, TASK-28, ~2-3 hari)

Export Excel/PDF untuk laporan: daftar peserta, pembayaran, hasil seleksi, kelulusan.

---

## Fase 10 â€” Testing & Polish (TASK-29, TASK-30)

E2E testing full flow + optimasi performa & keamanan.

---

## Urutan Prioritas

| Fase | Prioritas | Status |
|------|-----------|--------|
| **Fase 0** â€” Bug Fix | ðŸ”´ Kritis | âœ… Selesai |
| **Fase 1** â€” Config UI | ðŸ”´ Kritis | âœ… Selesai |
| **Fase 2** â€” Profile UI | ðŸ”´ Kritis | âœ… Selesai |
| **Fase 3** â€” Doc Review | ðŸŸ¡ Tinggi | âœ… Selesai |
| **Fase 4** â€” Payment UI | ðŸŸ¡ Tinggi | âœ… Selesai |
| **Fase 5** â€” Selection UI | ðŸŸ¡ Tinggi | âœ… Selesai |
| **Fase 6** â€” Post-Selection | ðŸŸ¢ Medium | âœ… Selesai |
| **Fase 7** â€” Notifications | ðŸŸ¢ Medium | âœ… Selesai |
| **Fase 8** â€” Dashboards | ðŸŸ¢ Medium | â³ Belum |
| **Fase 9** â€” Reports | ðŸŸ¢ Medium | â³ Belum |
| **Fase 10** â€” Testing | ðŸ”´ Kritis | â³ Belum |

---

## Verifikasi

Setiap fase selesai, lakukan:
1. **Backend**: test endpoint via curl
2. **Frontend**: test UI via browser
3. **Typecheck**: `npx tsc -b` (frontend), `npx tsc --noEmit` (backend)
4. Commit + push sesuai workflow git yang sudah ada

---

## Catatan Teknis

- Pola kode mengikuti halaman yang sudah ada (`ApplicantDocumentsPage`, `AdminDashboardPage`, dll.)
- Semua service function sudah terdefinisi di `src/services/index.ts` â€” tinggal dipanggil
- UI components yang tersedia: Button, Input, Select, Card, Modal, Badge, Alert, Spinner, Pagination, ConfirmDialog, Toast
- Tidak ada React Query/SWR â€” semua pakai `useState` + `useEffect` manual
- Tidak ada form library â€” semua pakai controlled React inputs

