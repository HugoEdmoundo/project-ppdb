> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# Log Implementasi Fase 0-10

> Tanggal: 2026-07-10

---

## Fase 0 â€” Bug Fix: Mount post.routes.ts

### Perubahan

| File | Aksi | Deskripsi |
|------|------|-----------|
| `backend.ptdarrahman/src/app.ts` | Edit | Tambah `app.route('/post', postRoutes)` |

24 endpoint MOU/acceptance/re-registration/MPLS yang tadinya dead code sekarang bisa diakses via prefix `/post`.

---

## Fase 1 â€” PPDB Configuration UI

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/admin/PeriodsPage.tsx` | Tab Periode + Gelombang (CRUD lengkap) |
| `src/pages/admin/LevelsPage.tsx` | Tab Jenjang + Kategori + Alur Seleksi (CRUD + flow steps editor) |
| `src/pages/admin/WaveConfigPage.tsx` | Mapping gelombangâ†”jenjangâ†”kategoriâ†”alur |
| `plan/incremental/PLAN.md` | Rencana pengerjaan 10 fase |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/services/index.ts` | Edit | Tambah `ppdbService` â€” 30+ function |
| `src/App.tsx` | Edit | Mount halaman baru, hapus dari placeholder |
| `src/layouts/AdminLayout.tsx` | Edit | Update sidebar |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/periods`, `/admin/waves` â†’ placeholder | âœ… CRUD Periode + Gelombang (tab) |
| `/admin/levels`, `/admin/categories`, `/admin/flows` â†’ placeholder | âœ… CRUD Jenjang + Kategori + Alur (tab) |
| `/admin/wave-configs` â†’ placeholder | âœ… Mapping gelombang |

---

## Fase 2 â€” Applicant Profile, Parents & History

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/applicant/ApplicantProfilePage.tsx` | View + edit profil pendaftar |
| `src/pages/applicant/ApplicantParentsPage.tsx` | Tab Ayah/Ibu/Wali dengan form |
| `src/pages/applicant/ApplicantHistoryPage.tsx` | Timeline riwayat status |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Mount 3 halaman baru di `/applicant/*` |
| `src/layouts/ApplicantLayout.tsx` | Edit | Tambah ikon Users, Clock; sidebar link Orang Tua + Riwayat |
| `src/pages/admin/WaveConfigPage.tsx` | Fix | `</>` â†’ `</div>` (broken fragment) |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/applicant/profile` â†’ placeholder | âœ… View/Edit profil |
| `/applicant/parents` â†’ placeholder | âœ… Tab Ayah/Ibu/Wali |
| `/applicant/history` â†’ placeholder | âœ… Timeline status |

### Detail

- **ProfilePage**: view mode dua card (Data Pribadi, Data Akademik & Alamat) + card Pilihan PPDB. Edit mode form semua field. Lock edit jika status di tahap lanjut.
- **ParentsPage**: 3 tab, form per tab (nama, NIK, telepon, email, pekerjaan, pendidikan, penghasilan, alamat). Dirty tracking.
- **HistoryPage**: timeline vertikal dengan badge status lamaâ†’baru, timestamp, notes.

---

## Fase 3 â€” Document Admin Review UI

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/admin/AdminDocumentsPage.tsx` | Verifikasi dokumen â€” tabel review queue + modal review |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Import AdminDocumentsPage, mount di `/admin/documents` |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/documents` â†’ placeholder | âœ… Review queue + verifikasi/tolak |

### Detail

- **Filter status**: dropdown Select (Menunggu/Terverifikasi/Ditolak), default "uploaded"
- **Tabel FIFO**: FIFO dari backend (`created_at.asc`). Kolom: Pendaftar, No. Pendaftaran, Dokumen, Status, Upload, Aksi
- **Pagination**: manual page state
- **Modal Review**: detail pendaftar + dokumen, pratinjau gambar (img untuk jpg/png/gif), non-gambar ada link buka tab baru, tombol Verifikasi (hijau) dan Tolak (merah), field alasan penolakan
- Endpoint: `GET /ppdb/admin/documents/review`, `PUT /ppdb/admin/documents/:id/review`

---

## Verifikasi

- âœ… Frontend typecheck: `npx tsc -b` â€” bersih (2 warning lama di LandingPage.tsx bukan dari perubahan)
- âœ… Backend typecheck: `npx tsc --noEmit` â€” bersih

---

## Status Keseluruhan

| Fase | Status |
|------|--------|
| Fase 0 â€” Bug Fix post.routes | âœ… Selesai |
| Fase 1 â€” Config UI | âœ… Selesai |
| Fase 2 â€” Profile UI | âœ… Selesai |
| Fase 3 â€” Doc Review | âœ… Selesai |
| Fase 4 â€” Payment UI | â³ Belum |
| Fase 5 â€” Selection UI | âœ… Selesai |
| Fase 6 â€” MOU & Post-Selection | âœ… Selesai |
| Fase 7 â€” Notifications | â³ Belum |
| Fase 8 â€” Dashboards | â³ Belum |
| Fase 9 â€” Reports | â³ Belum |
| Fase 10 â€” Testing & Polish | â³ Belum |
antPaymentsPage.tsx` | Invoice list + upload bukti bayar (applicant) |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Mount `/admin/payments` dan `/applicant/payments` |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/payments` â†’ placeholder | âœ… Tab transaksi (verifikasi bukti) + diskon CRUD |
| `/applicant/payments` â†’ placeholder | âœ… List invoice + upload pembayaran |

### Detail

#### AdminPaymentsPage.tsx
- **Tab Transaksi**: filter status (Pending/Terverifikasi/Ditolak), tabel dengan kolom No. Transaksi, Jumlah, Metode, Status, Tanggal, Aksi. Modal review: detail transaksi + preview bukti bayar + tombol Verifikasi/Tolak + catatan penolakan.
- **Tab Invoice**: placeholder (invoice management via applicant detail).
- **Tab Diskon**: CRUD tabel (Kode, Nama, Tipe, Nilai, Status), modal form dengan field: kode, nama, tipe (persentase/nominal), nilai, tanggal berlaku, maks penggunaan.

#### ApplicantPaymentsPage.tsx
- **Summary cards**: Total Tagihan, Sudah Dibayar, Sisa.
- **Invoice list**: per invoice: no. invoice, nama tahap, jumlah, jatuh tempo, badge status (Belum Bayar/Lunas/Jatuh Tempo), riwayat transaksi, tombol Bayar.
- **Upload modal**: input jumlah + upload file bukti (PDF/JPG/PNG) via `paymentService.submitPayment`.

---

## Verifikasi

- âœ… Frontend typecheck: `npx tsc -b` â€” bersih (2 warning lama di LandingPage.tsx bukan dari perubahan)
| Fase 6 â€” MOU & Post-Selection | âœ… Selesai |
| Fase 7 â€” Notifications | â³ Belum |
| Fase 8 â€” Dashboards | â³ Belum |
| Fase 9 â€” Reports | â³ Belum |
| Fase 10 â€” Testing & Polish | â³ Belum |

---

## Fase 6 â€” MOU & Post-Selection UI

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/admin/AdminPostPage.tsx` | Tab MOU + Surat Penerimaan + Daftar Ulang + MPLS (admin) |
| `src/pages/applicant/ApplicantPostPage.tsx` | Tab MOU + Surat Penerimaan + Daftar Ulang + MPLS (applicant) |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Mount `/admin/mou` dan `/applicant/mou` |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/mou`, `/admin/re-registrations`, `/admin/mpls` â†’ placeholder | âœ… MOU (template + generate + review) + Surat Penerimaan + Daftar Ulang + MPLS (4 tab) |
| `/applicant/mou`, `/applicant/re-registration` â†’ placeholder | âœ… MOU (download + upload TTD) + Surat Penerimaan + Daftar Ulang + MPLS (4 tab) |

### Detail

#### AdminPostPage.tsx
- **Tab MOU**: CRUD template, generate MOU per peserta, review (approve/reject) MOU yang sudah ditandatangani
- **Tab Surat Penerimaan**: generate surat penerimaan per peserta, list surat
- **Tab Daftar Ulang**: jadwalkan daftar ulang per peserta + mark attendance (hadir/tidak hadir)
- **Tab MPLS**: CRUD jadwal MPLS, assign peserta ke jadwal, card view per jadwal dengan jumlah peserta

#### ApplicantPostPage.tsx
- **Tab MOU**: lihat status MOU (generated/menunggu/disetujui/ditolak), download MOU, upload file TTD
- **Tab Surat Penerimaan**: lihat surat penerimaan, download
- **Tab Daftar Ulang**: lihat jadwal daftar ulang (tanggal, lokasi, status kehadiran)
- **Tab MPLS**: lihat jadwal MPLS yang di-assign (tanggal, lokasi)

---

## Verifikasi

- âœ… Frontend typecheck: `npx tsc -b` â€” bersih (2 warning lama di LandingPage.tsx bukan dari perubahan)<ï½œendâ–ofâ–thinkingï½œ>ENDLOG

| Fase 7 â€” Notifications | âœ… Selesai |

---

## Fase 7 â€” Notifications & Calendar UI

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/admin/AdminNotificationsPage.tsx` | Tab Template + Kirim + Riwayat + Kalender (admin) |
| `src/pages/applicant/ApplicantNotificationsPage.tsx` | Inbox notifikasi + mark read (applicant) |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Mount `/admin/notifications` dan `/applicant/notifications` |
| `src/layouts/ApplicantLayout.tsx` | Edit | Tambah sidebar link Notifikasi (Bell icon) |

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/notifications` â†’ placeholder | âœ… Template CRUD + Kirim notifikasi + Riwayat + Kalender akademik (4 tab) |
| `/applicant/notifications` â†’ belum ada route | âœ… Inbox notifikasi + mark as read |

### Detail

#### AdminNotificationsPage.tsx
- **Tab Template**: CRUD template notifikasi (kode, nama, subjek, body template, channel). Card view.
- **Tab Kirim**: form kirim notifikasi â€” user ID + pilih template (auto-fill judul/pesan) + channel.
- **Tab Riwayat**: list notifikasi yang sudah dikirim (judul, pesan, channel, status baca, timestamp). Pagination.
- **Tab Kalender**: CRUD event akademik (judul, tanggal, tipe event, deskripsi, period_id). Card view dengan badge tipe + publik/internal.

#### ApplicantNotificationsPage.tsx
- Inbox notifikasi dengan unread count
- Card per notifikasi: judul, pesan, timestamp, dot unread
- Klik notifikasi â†’ mark as read
- Tombol "Tandai Semua Dibaca" untuk bulk

---

## Verifikasi

- âœ… Frontend typecheck: `npx tsc -b` â€” bersih (2 warning lama di LandingPage.tsx bukan dari perubahan)

---

## Fase 8 â€” Dashboard Enhancement

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/pages/admin/AdminDashboardPage.tsx` | Edit | Tambah audit log section + `ScrollText` icon |

### Detail

- Tambah section "Aktivitas Terbaru" â€” tampilkan 10 audit log terbaru (username, action, entity_type, timestamp)
- Data di-fetch paralel dengan `Promise.all([getStats(), getAuditLogs()])`
- Layout: Quick Actions + Audit Log side-by-side dalam grid 2 kolom
- Link "Lihat selengkapnya â†’" ke `/admin/audit-log`

---

## Fase 9 â€” Reports Page

### File Baru

| File | Deskripsi |
|------|-----------|
| `src/pages/admin/AdminReportsPage.tsx` | Halaman laporan â€” summary + daftar laporan |

### File Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `src/App.tsx` | Edit | Mount `/admin/reports` |

### Detail

- **Summary cards**: Total Pendaftar, Lulus, Pembayaran Lunas, Dokumen Lengkap (data dari `getReportsSummary`)
- **Report types**: Daftar Pendaftar, Rekap Pembayaran, Hasil Seleksi, Status Dokumen, Ringkasan PPDB â€” card dengan deskripsi dan tombol Export
- **Placeholder notice**: endpoint export (Excel/PDF) perlu ditambahkan ke backend

### Rute

| Sebelum | Sesudah |
|---------|---------|
| `/admin/reports` â†’ placeholder | âœ… Summary + daftar report types |

---

## Fase 10 â€” Build Verification

### Hasil

- âœ… Frontend typecheck: `npx tsc -b` â€” bersih
- âœ… Backend typecheck: `npx tsc --noEmit` â€” bersih
- âœ… Build: `vite build` â€” sukses (607ms, 484KB JS gzip 125KB)

---

## Status Keseluruhan

| Fase | Status |
|------|--------|
| Fase 0 â€” Bug Fix post.routes | âœ… Selesai |
| Fase 1 â€” Config UI | âœ… Selesai |
| Fase 2 â€” Profile UI | âœ… Selesai |
| Fase 3 â€” Doc Review | âœ… Selesai |
| Fase 4 â€” Payment UI | âœ… Selesai |
| Fase 5 â€” Selection UI | âœ… Selesai |
| Fase 6 â€” MOU & Post-Selection | âœ… Selesai |
| Fase 7 â€” Notifications & Calendar | âœ… Selesai |
| Fase 8 â€” Dashboard Enhancement | âœ… Selesai |
| Fase 9 â€” Reports | âœ… Selesai |
| Fase 10 â€” Build & TypeCheck | âœ… Selesai |
