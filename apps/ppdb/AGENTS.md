# PPDB Frontend App (PTDARRAHMAN)

Aplikasi frontend Penerimaan Peserta Didik Baru (PPDB) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Tech Stack
- **Framework:** React 19 + Vite 8
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3, `class-variance-authority`, `clsx`, `tailwind-merge`
- **UI Components:** Radix UI primitives (`@radix-ui/react-*`), shadcn-style structured in `src/components/ui/`, Lucide React for icons
- **Routing:** React Router v7 (`react-router-dom`)
- **Build & Deploy:** Built with `tsc -b && vite build`

## Architecture & State Management
- **API Client (`src/api/client.ts`):**
  - Custom `fetch` wrapper (`apiFetch`) with JSON-safe error parsing.
  - Cookie-based auth (`credentials: 'include'`); no tokens in localStorage/headers. Automatic token refresh via `/auth/refresh` on 401, then redirects to `/auth/login` if it still fails.
  - `API_BASE` berasal dari `VITE_API_URL` (fallback string kosong → request ke origin yang sama / Vite dev proxy). TIDAK ada mekanisme failover PRIMARY→FALLBACK API; `fetchWithFallback` hanyalah wrapper `fetch` polos.
- **Services (`src/services/`):**
  - Modular API calls: `authService` (di `auth.service.ts`), plus `ppdbService`, `applicantService`, `paymentService`, `notificationService`, `settingsService` (di `index.ts`).
- **Global Contexts (`src/contexts/`):**
  - `AuthContext`: Manages user state, login/logout, and permissions. Auto-refreshes `/auth/me` every 30 seconds to catch permission or deactivation changes on the fly.

## Routes & Pages (`src/pages/`)
### Public
- `/` (`LandingPage`): Entry point for PPDB.
- `/register` (`RegisterPage`): New student registration.
  - **Pattern:** Sukses → render inline success state + kredensial login via `SuccessState`/`CredentialsCard` (bukan route terpisah). Gagal → alert validasi inline di form.
- `/globe` (`GlobeDemoPage`): Halaman demo globe.
- `/auth/login` (`LoginPage`): Shared login page for applicants and admins.
- `/applicant/login`: Redirect ke `/auth/login`.

### Applicant (Protected, `role="applicant"`)
- `/checkout` (`CheckoutPage`): Payment paywall. Restricts users here if `payment_status != paid`.
- `/applicant` (`DashboardPage`): Main dashboard for applicants. Requires the payment status to be paid (`requirePaid={true}`).
- `/applicant/kartu-ujian` (`ExamCardPage`): Download kartu/konfigurasi ujian TIU (SEB). Requires `requirePaid={true}`.

### Admin (Protected, `role="admin"`)
Wrapped in `AdminLayout` (`src/layouts/AdminLayout.tsx`):
- `/admin/dashboard` (`AdminDashboardPage`): General stats and overview.
- `/admin/data-pendaftar` (`DataPendaftarPage`): Applicant data overview.
- `/admin/verifikasi-dokumen` (`VerifikasiDokumenPage`): Document reviews and detailed applicant data.
- `/admin/pembayaran-formulir` (`PembayaranFormulirPage`): Form payment invoices and verifications.
- `/admin/pembayaran-tahap2` (`PembayaranTahap2Page`): Stage-2 (DP) payments and installments.
- `/admin/sessions/tahfidz` (`Sessions1on1Page`): Session 1:1 Tahfidz scheduling and penguji.
- `/admin/sessions/wawancara` (`Sessions1on1Page`, `forcedType="interview"`): Session 1:1 Wawancara scheduling and pewawancara.
- `/admin/sessions/:sessionType/evaluasi/:sessionId` (`SessionEvaluationPage`): Evaluator scoring form.
- `/admin/penilaian` (`PenilaianPage`): Recapitulation of results / passing decisions.
- `/admin/periods` (`PeriodsPage`): PPDB periods and waves management.
- `/admin/tiu-settings` (`TIUSettingsPage`): Global TIU settings (Google Form URL, webhook secret, duration).
- `/admin/notifications` (`NotificationsPage`): Notification history/templates.
- `/admin/selection` and `/admin/rubrik` (`SelectionPage`): Scoring rubric configuration.
- `/admin/pengumuman` (`LoaSkdPage`): Preview/generate LoA & SKD.
- `/admin/arsip` (`ArsipPendaftarPage`): Cross-period dossier search and export.
- `/admin/profile` (`AdminProfilePage`): Admin profile settings.

### Errors
- `/403` (`ForbiddenPage`): Insufficient permissions.
- `*` (`NotFoundPage`): 404 Not Found.

## Product Requirements: Backoffice Configuration

Ikuti ringkasan kebutuhan di root [`AGENTS.md`](../../AGENTS.md) dan dokumen sumber di `../../docs/`. Arah sistem PPDB lama bukan spesifikasi untuk perubahan produk baru. Struktur route dan implementasi yang dijelaskan di atas hanya membantu menemukan kode saat ini.

Fokus produk yang disepakati adalah konfigurasi backoffice sebelum pendaftaran dibuka:
- Gelombang: waktu buka/tutup, biaya formulir, kuota pendaftar, diskon DP3/gedung/SPP, diskon untuk X pendaftar pertama, dan minimal DP.
- Template/LoA: generate dan preview LoA sebelum publish, klausul non-refundable yang pada diagram ditandai hardcoded, dan latar SKD.
- Rubrik: kriteria, bobot, dan formulir evaluator Tahfidz serta wawancara. Nilai TIU masuk otomatis; admin tidak menginput nilainya.
- Session 1:1 Tahfidz dan Session 1:1 Wawancara: jadwal, petugas, mode online/offline, dan tautan/lokasi.
- Pengaturan TIU global: URL Google Form sumber soal, webhook secret, durasi tes, dan Apps Script untuk menyinkronkan soal ke aplikasi; tidak ada konfigurasi TIU per gelombang.

Hanya satu periode aktif secara global. Mengaktifkan periode menonaktifkan periode lain dan gelombang di luarnya; menonaktifkan periode menonaktifkan gelombang di dalamnya. Gelombang hanya bisa aktif jika periode induknya aktif, dan hanya satu gelombang boleh aktif dalam satu periode. Pendaftar otomatis terkait ke satu-satunya gelombang aktif pada periode aktif. Kuota dan diskon X pendaftar awal dihitung dari pembayaran formulir sukses; saat kuota tercapai, pendaftaran dan gelombang ditutup otomatis serta tagihan yang belum dibayar dibatalkan. Kirim pengingat pembayaran setiap Senin bagi pendaftar yang belum bayar sampai gelombang ditutup. Data lintas periode/gelombang dicari dari halaman Arsip/Cari Pendaftar khusus; jangan menambahkan filter periode/gelombang ke semua halaman.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran. Halaman Arsip/Cari Pendaftar menampilkan dossier lengkap satu pendaftar, termasuk biodata, dokumen beserta riwayat verifikasi, TIU, sesi/nilai Session 1:1 Tahfidz/Wawancara, keputusan, LoA, pembayaran/cicilan, dan SKD/nomor registrasi. Sediakan unduhan per berkas dan ZIP lengkap berisi ringkasan PDF serta berkas asli terstruktur.

TIU menggunakan metode Pre-filled Google Form yang dibungkus Safe Exam Browser (SEB). URL Form (beserta placeholder `{token}`), webhook secret, dan durasi disetel global. Pendaftar mengunduh konfigurasi `.seb` dari dashboard (endpoint `/selection/applicants/me/tiu-seb`), di mana timer server mulai berjalan saat file digenerate. SEB membuka Google Form dengan token pendaftar terisi otomatis dan layar terkunci (hanya desktop/laptop Windows/macOS; ponsel tidak didukung). Saat peserta submit form, trigger `onSubmit` Apps Script mengirim nilai kuis secara real-time ke `POST /ppdb/webhook/tiu`. Backend memvalidasi token dan batas durasi (submit <= start + duration + 5 menit toleransi), menyimpan nilai secara idempoten, lalu memicu notifikasi WhatsApp hasil TIU. Setiap pendaftar hanya mendapat satu attempt tanpa retake. Ikuti `docs/PANDUAN_UJIAN_TIU_SEB.md` dan `docs/INTEGRASI_TIU_APPS_SCRIPT.md`.

## Aturan Khusus: Jenjang dan Formulir Kesehatan

**Tidak ada pemilihan jenjang pendidikan.**
- Aplikasi ini tidak mengenal daftar jenjang (`SMP`, `SMK`, atau lainnya) dan tidak menyediakan pemilihan jenjang di mana pun: `/register`, dashboard pendaftar, halaman publik, maupun panel wave. Jangan menambah field, select, checkbox, atau validasi jenjang.
- Jangan membaca/menampilkan whitelist `ALLOWED_LEVELS`, scope `allowed_levels` gelombang, atau field `registration_level` pendaftar sebagai sumber kebenaran. Itu sisa flow lama; jangan andalkan untuk menentukan UI atau validasi baru.
- Bila jenjang perlu tampil pada dokumen (LoA/SKD/transkrip), ia adalah atribut tetap institusi, bukan input pengguna. Butuh keputusan produk sebelum menambah setting baru.

**Formulir Identifikasi Kesehatan (pengganti Medcheck).**
- Diisi sendiri oleh pendaftar pada `/register`, bukan oleh petugas medis, dan disimpan sebagai data profil kesehatan pendaftar yang tampil di detail/dossier untuk admin.
- Rincian pertanyaan, urutan, dan caption ada di `docs/REQUIREMENTS.md` bagian "Formulir Identifikasi Kesehatan" (10 pertanyaan + Pernyataan). Ikuti urutan dan caption itu.
- Ya/Tidak membuka turunannya secara kondisional; keterangan pada jawaban "Tidak" dikosongkan dan tidak dikirim. Pertanyaan diagnosis dan alergi berupa daftar checkbox, tidak memaksa minimal satu centang.
- Pernyataan wajib dikonfirmasi sebelum submit, dan kelengkapan divalidasi ulang di server.
- Data sensitif: Jangan tampilkan di list/tabel umum. Akses lewat izin khusus, catat jejak audit, dan sudah termasuk dossier/ZIP di halaman Arsip.
- Saat ini belum diputuskan apakah boleh diperbarui setelah pendaftaran, apakah semua pertanyaan wajib, siapa boleh membaca, dan berapa lama disimpan. Jangan implementasi jawaban atas hal itu tanpa keputusan.

Koreksi penting: kebijakan attempt TIU di paragraf tepat di atas sudah usang—jangan ikuti bagian yang menyebut retake atau beberapa attempt. Aturan terbaru: setiap pendaftar hanya memiliki satu attempt dan tidak bisa retake setelah selesai/waktu habis. Jawaban disimpan otomatis di server; bila koneksi putus, peserta membuka kembali lewat SEB untuk melanjutkan attempt yang sama dengan jawaban tersimpan dipulihkan. Timer tetap berjalan dan tidak di-reset.

## Dynamic Branding & Events
- **Favicon & Logo:** Di-fetch dinamis via `settingsService.getFavicon()` dan `settingsService.getLogo()` dari endpoint `/companyprofile/settings/{key}`.
- **⚠️ WAJIB — No Static Logo:** Tidak ada aset logo statis di project ini. Logo HARUS selalu diambil secara dinamis dari API. Jangan pernah hardcode path gambar logo.
- **Real-time Updates:** Perubahan pada brand otomatis live di client melalui Server-Sent Events (SSE) yang listening di `/companyprofile/events` (lihat `App.tsx` & `AdminLayout.tsx`).

## Loading System (`src/components/ui/`)
- **`PageLoader`** — Full-screen branded loader digunakan di `ProtectedRoute` saat auth check.
  - Logo diambil **dinamis** via `settingsService.getLogo()` (GET `/companyprofile/settings/logo`), fallback ke text mark jika belum tersedia.
  - Animasi: dual SVG arc spinner (emerald luar + gold dalam, counter-rotating) + logo pulse + staggered dots.
  - CSS: pure CSS keyframes (`ring-spin`, `logo-pulse`) di `index.css`. SVG arc gap menggunakan `strokeDasharray`.
  - **Dilarang** pakai `<img src="/logo.png">` atau aset statis apapun.
- **`Skeleton`** — Shimmer gradient (flowing `before:` pseudo-element) menggantikan `animate-pulse` biasa.
- **`TableSkeletonRows`** — Renders N baris skeleton di dalam `<TableBody>` untuk replace teks "Memuat data...".
  - Usage: `<TableSkeletonRows cols={7} rows={6} />` di dalam blok `{loading ? (...) : ...}`.
  - Tiap sel punya lebar variatif + stagger delay buat kesan loading yang natural.


## Build & Run
- `npm run dev` — Start Vite dev server.
- `npm run build` — Type checking (`tsc -b`) & build production (`vite build`).
- `npm run preview` — Preview local build production.
- `npm run lint` — Lint code via ESLint.
