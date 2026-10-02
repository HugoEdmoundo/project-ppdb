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
- `/auth/login` (`LoginPage`): Shared login page for applicants and admins.

### Applicant (Protected, `role="applicant"`)
- `/checkout` (`CheckoutPage`): Payment paywall. Restricts users here if `payment_status != paid`.
- `/applicant` (`DashboardPage`): Main dashboard for applicants. Requires the payment status to be paid (`requirePaid={true}`).

### Admin (Protected, `role="admin"`)
Wrapped in `AdminLayout` (`src/layouts/AdminLayout.tsx`):
- `/admin/dashboard` (`AdminDashboardPage`): General stats and overview.
- `/admin/data-pendaftar` (`DataPendaftarPage`): Applicant data overview.
- `/admin/applicants` (`ApplicantsPage`): Document reviews and detailed applicant data.
- `/admin/periods` (`PeriodsPage`): PPDB periods and waves management.
- `/admin/payments` (`PaymentsPage`): Invoices and transaction verifications.
- `/admin/notifications` (`NotificationsPage`): Notification history/templates.
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
- Sesi Tahfidz dan wawancara: jadwal, petugas, mode online/offline, dan tautan/lokasi.
- Pengaturan TIU global: URL Google Form sumber soal, webhook secret, durasi tes, dan Apps Script untuk menyinkronkan soal ke aplikasi; tidak ada konfigurasi TIU per gelombang.

Hanya satu periode aktif secara global. Mengaktifkan periode menonaktifkan periode lain dan gelombang di luarnya; menonaktifkan periode menonaktifkan gelombang di dalamnya. Gelombang hanya bisa aktif jika periode induknya aktif, dan hanya satu gelombang boleh aktif dalam satu periode. Pendaftar otomatis terkait ke satu-satunya gelombang aktif pada periode aktif. Kuota dan diskon X pendaftar awal dihitung dari pembayaran formulir sukses; saat kuota tercapai, pendaftaran dan gelombang ditutup otomatis serta tagihan yang belum dibayar dibatalkan. Kirim pengingat pembayaran setiap Senin bagi pendaftar yang belum bayar sampai gelombang ditutup. Data lintas periode/gelombang dicari dari halaman Arsip/Cari Pendaftar khusus; jangan menambahkan filter periode/gelombang ke semua halaman.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran. Halaman Arsip/Cari Pendaftar menampilkan dossier lengkap satu pendaftar, termasuk biodata, dokumen beserta riwayat verifikasi, TIU, sesi/nilai Tahfidz dan wawancara, keputusan, LoA, pembayaran/cicilan, dan SKD/nomor registrasi. Sediakan unduhan per berkas dan ZIP lengkap berisi ringkasan PDF serta berkas asli terstruktur.

TIU dijalankan dalam aplikasi PPDB, bukan Google Form. URL Form, webhook secret, dan durasi disetel global. Semua soal TIU berupa pilihan ganda dengan satu jawaban benar. Apps Script menyinkronkan langsung soal, urutan, opsi, dan kunci tanpa review/publish manual; jika sync gagal atau paket tidak valid, jangan mengganti paket valid terakhir. Tombol Mulai membuat satu attempt pending; timer server mulai setelah tiket sekali pakai ditukar dan SEB tervalidasi. Setiap pendaftar hanya mendapat satu attempt tanpa retake. Jawaban disimpan otomatis dan nilai dihitung otomatis saat submit/waktu habis; nilai dikirim real-time ke backend melalui webhook tanpa input manual admin. Setelah koneksi pulih, lanjutkan attempt yang sama lewat tiket resume, pulihkan jawaban tersimpan, dan pertahankan timer tanpa reset. Event/webhook memakai applicant/attempt ID; backend mengambil periode/gelombang dari relasi pendaftar. TIU wajib memakai SEB di komputer desktop/laptop Windows atau macOS; ponsel/tablet tidak didukung. Ikuti `docs/PANDUAN_UJIAN_TIU_SEB.md`. Validasi Browser Exam Key/Config Key di server wajib; user-agent saja tidak cukup.

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
