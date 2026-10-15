# PPDB Frontend App (PTDARRAHMAN)

Aplikasi frontend Penerimaan Peserta Didik Baru (PPDB) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Melayani calon santri/wali murid (registrasi, tes TIU via SEB, seleksi 1:1, pembayaran QRIS Pakasir v2, cicilan, dan LoA/SKD) serta backoffice admin PPDB.

## Tech Stack
- **Framework:** React 19 + Vite 8
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3, `class-variance-authority`, `clsx`, `tailwind-merge`
- **UI Components:** Radix UI primitives (`@radix-ui/react-*`), custom components di `src/components/ui/`, Lucide React untuk icons
- **Routing:** React Router v7 (`react-router-dom`)
- **Build & Deploy:** Dibangun dengan `tsc -b && vite build`

## Architecture & State Management
- **API Client (`src/api/client.ts`):**
  - Custom `fetch` wrapper (`apiFetch`) dengan parsing error JSON aman.
  - Berbasis cookie (`credentials: 'include'`); tidak ada token otentikasi di localStorage/header. Refresh token otomatis via `/companyprofile/auth/refresh` atau `/auth/refresh` saat 401.
  - `API_BASE` berasal dari `VITE_API_URL` (fallback kosong → same origin / dev proxy).
- **Services (`src/services/`):**
  - Modular API calls: `authService`, `ppdbService`, `applicantService`, `paymentService`, `notificationService`, `settingsService`.
- **Global Contexts (`src/contexts/`):**
  - `AuthContext`: Mengelola state pendaftar/admin, login/logout, dan permission. Auto-refresh `/auth/me` tiap 30 detik untuk mendeteksi perubahan status atau izin.

## Routes & Pages (`src/pages/`)
### 1. Public Routes
- `/` (`LandingPage`): Beranda publik PPDB.
- `/register` (`RegisterPage`): Formulir pendaftaran calon santri bertahap (7 bagian: Pilih Jalur, Identitas, Orang Tua, Kontak, Domisili, Identifikasi Kesehatan 10 soal, Pernyataan).
- `/globe` (`GlobeDemoPage`): Halaman demo 3D globe.
- `/auth/login` (`LoginPage`): Halaman login terpusat untuk pendaftar dan admin PPDB.
- `/applicant/login`: Alias redirect ke `/auth/login`.
- `/kuitansi/:id` & `/receipt/:id` (`PublicReceiptPage`): Halaman verifikasi publik kuitansi pembayaran resmi (dengan QR code dan signature hash).
- `/loa/:registrationNo` (`PublicLoaPage`): Halaman verifikasi publik Surat Penerimaan (LoA) resmi calon santri.

### 2. Applicant Protected Routes (`role="applicant"`, `requirePaid={true}`)
- `/checkout` (`CheckoutPage`): Halaman paywall biaya formulir (dibuka jika `payment_status != paid`).
- `/applicant` (`ApplicantDashboardPage`): Dashboard utama pendaftar yang memuat timeline tahapan dan rangkuman status.
- `/applicant/kuitansi` (`ApplicantReceiptPage`): Riwayat dan rincian kuitansi pembayaran resmi (formulir, DP, dan cicilan).
- `/applicant/dokumen` (`ApplicantDocumentsPage`): Unggah dokumen wajib (NISN, KK, Akte, Foto) serta dokumen tambahan jalur khusus (Sertifikat/Rapor/Bukti Hafalan).
- `/applicant/ujian-tiu` (`SelectionStagePage` - section TIU): Pengunduhan file `.seb` untuk ujian TIU Safe Exam Browser dan panduan ujian.
- `/applicant/seleksi-tahfidz` (`SelectionStagePage` - section Tahfidz): Pemilihan slot jadwal sesi 1:1 Tahfidz bersama penguji.
- `/applicant/seleksi-wawancara` (`SelectionStagePage` - section Wawancara): Pemilihan slot sesi 1:1 Wawancara (terbuka otomatis setelah nilai Tahfidz terinput).
- `/applicant/pengumuman` (`ResultStagePage`): Pengumuman kelulusan, preview LoA resmi, dan tanda tangan digital orang tua.
- `/applicant/bayar-dp` (`DpStagePage`): Pembayaran DP (Down Payment) biaya masuk melalui Pakasir v2 QRIS dinamis.
- `/applicant/pembayaran-tahap2` (`Stage2PaymentPage`): Pengaturan opsi cicilan biaya masuk, pembayaran cicilan, dan penerbitan Surat Keterangan Diterima (SKD) serta link WhatsApp Group resmi santri.
- `/applicant/kartu-ujian` (`ExamCardPage`): Unduh kartu ujian/identitas pendaftar.

### 3. Admin Protected Routes (`role="admin"`, wrapped in `AdminLayout`)
- `/admin/dashboard` (`AdminDashboardPage`): Statistik pendaftar dan analitik ringkas.
- `/admin/data-pendaftar` (`DataPendaftarPage`): Ringkasan dan tabel pendaftar aktif.
- `/admin/verifikasi-dokumen` (`VerifikasiDokumenPage`): Pemeriksaan berkas pendaftar dan kuesioner kesehatan.
- `/admin/pembayaran-formulir` (`PembayaranFormulirPage`): Monitoring invoice formulir dan integrasi Pakasir.
- `/admin/pembayaran-tahap2` (`PembayaranTahap2Page`): Monitoring pembayaran DP dan tagihan cicilan tahap 2.
- `/admin/sessions/tahfidz` (`Sessions1on1Page`): Manajemen jadwal & penguji sesi 1:1 Tahfidz.
- `/admin/sessions/wawancara` (`Sessions1on1Page`, `forcedType="interview"`): Manajemen jadwal & pewawancara sesi 1:1 Wawancara.
- `/admin/sessions/:sessionType/evaluasi/:sessionId` (`SessionEvaluationPage`): Form penilaian rubrik evaluator.
- `/admin/penilaian` (`PenilaianPage`): Rekapitulasi nilai akhir dan keputusan kelulusan.
- `/admin/review-loa` (`ReviewLoaPage`): Daftar seluruh penerima LoA (pendaftar lulus), termasuk yang sudah bertanda tangan maupun menunggu tanda tangan orang tua/wali.
- `/admin/pengumuman` (`LoaSkdPage`): Template LoA & latar SKD.
- `/admin/periods` (`PeriodsPage`): Manajemen periode dan gelombang pendaftaran.
- `/admin/tiu-settings` (`TIUSettingsPage`): Konfigurasi global TIU (URL Pre-filled Google Form, durasi, webhook secret).
- `/admin/notifications` (`NotificationsPage`): Riwayat dan template notifikasi WhatsApp.
- `/admin/selection` & `/admin/rubrik` (`SelectionPage`): Konfigurasi bobot rubrik penilaian.
- `/admin/arsip` (`ArsipPendaftarPage`): Pencarian arsip dossier lengkap lintas periode/gelombang dan ekspor ZIP.
- `/admin/profile` (`AdminProfilePage`): Pengaturan profil admin.

### 4. Error Pages
- `/403` (`ForbiddenPage`): Akses ditolak.
- `*` (`NotFoundPage`): Halaman tidak ditemukan.

---

## 💡 Komponen Modal & Fitur Spesial (`src/pages/applicant/components/`)
- **`OfficialReceiptModal`**: Modal dialog detail kuitansi resmi lengkap dengan stempel digital dan verifikasi QR link.
- **`QrisPaymentModal`**: Dialog QRIS dinamis Pakasir v2 dengan timer kedaluwarsa, panduan bayar, dan pengecekan status otomatis.
- **`ApplicantLoAModal`**: Modal tampilan Surat Penerimaan Resmi (LoA) dengan klausul non-refundable dan kanvas tanda tangan.
- **`ApplicantSKDModal`**: Modal Surat Keterangan Diterima (SKD) dengan nomor registrasi unik resmi.
- **`LoaResultStep` & `DpCertificateStep`**: Komponen tahapan kelulusan dan pembayaran DP.

---

## 📋 Aturan Bisnis & Ruang Lingkup Sistem

1. **Status Ruang Lingkup:**
   - Konfigurasi backoffice admin dan tahapan seleksi pendaftar (dokumen, SEB TIU, sesi 1:1, pembayaran DP Pakasir v2, cicilan, LoA/SKD) **keduanya aktif** dalam sistem.
2. **Tanpa Pemilihan Jenjang:**
   - Sistem tidak mengenal jenjang (`SMP`, `SMK`). Tidak ada kolom/input jenjang di registrasi pendaftar maupun pengaturan gelombang.
3. **Kuesioner Identifikasi Kesehatan (10 Soal):**
   - Menggantikan Medcheck, diisi saat registrasi, tersimpan sebagai data profil sensitif yang hanya dapat dilihat di detail/dossier admin.
4. **Ujian TIU via Safe Exam Browser (SEB):**
   - Pendaftar mengunduh file `.seb` dari `/applicant/ujian-tiu`. Waktu mulai dicatat di server saat file di-generate.
   - SEB mengunci layar desktop (Windows/macOS) dan membuka Pre-filled Google Form dengan token pendaftar terisi otomatis.
   - Trigger `onSubmit` Apps Script mengirim nilai ke `POST /ppdb/webhook/tiu`. Nilai tersimpan idempoten dan memicu WA notifikasi.
5. **Pembayaran & Pakasir v2:**
   - Kuota gelombang dan diskon pendaftar awal dihitung dari pembayaran formulir sukses.
   - Pendaftar yang lulus membayar DP via QRIS Pakasir v2, lalu dapat mengatur skema cicilan sisa tagihan.
   - SKD dan tautan WhatsApp Group resmi santri hanya terbuka setelah DP Tahap 2 lunas.

---

## 🎨 Dynamic Branding & Loading
- **No Static Logo:** Logo institusi selalu diambil dinamis via `settingsService.getLogo()` (GET `/companyprofile/settings/logo`).
- **Live Updates:** Perubahan aset brand langsung terefleksi via Server-Sent Events (SSE) `/companyprofile/events`.
- **`PageLoader` & `Skeleton`:** Loader animasi dual SVG arc spinner tanpa aset gambar statis.

---

## 💻 Build & Run
- `npm run dev` — Menjalankan Vite dev server lokal (port default `5174` pada config lokal, atau `5173` saat dijalankan via Docker preview).
- `npm run build` — Type-checking (`tsc -b`) & build production (`vite build`).
- `npm run preview` — Menjalankan preview hasil build.
- `npm run lint` — Menjalankan ESLint.
