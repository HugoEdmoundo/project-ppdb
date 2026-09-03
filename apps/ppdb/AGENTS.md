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
  - Custom `fetch` wrapper (`apiFetch`).
  - Automatic JWT token refresh via `/auth/refresh`.
  - Fallback mechanism from `PRIMARY_API` to `FALLBACK_API` upon connection failures.
- **Services (`src/services/`):**
  - Modular API calls: `authService`, `ppdbService`, `applicantService`, `documentService`, `paymentService`, `selectionService`, `postService`, `notifService`, `notificationService`, `dashboardService`, `settingsService`.
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

## PPDB Flow
1. **Registration**: User registers -> receives `payment_status = 'pending'` and a 7-day `payment_deadline`. Nominal biaya ditarik otomatis dari `registration_fee` di konfigurasi gelombang yang aktif.
2. **Paywall**: Users with pending payments are restricted to `/checkout`.
3. **Expiration**: If unpaid after 7 days, `payment_status` becomes `expired` and account is soft-deleted (`deleted_at` is set). Expired applicants **tetap tampil** di list admin dengan badge merah "EXPIRED" — tidak dihapus dari tampilan.
4. **Paid (Tahap 1)**: On success (manual or webhook), status becomes `paid` -> Dashboard is unlocked. Khusus pembayaran manual, admin dapat **membatalkan konfirmasi** (mengunci dashboard kembali).
5. **Selection & MOU**: Setelah lulus, admin memunculkan MOU dan biaya Tahap 2 (Daftar Ulang) beserta diskon/cicilan (Tabel `ppdb_applicant_discounts` & `ppdb_stage2_bills`).

## Access Control & Permissions (ATURAN WAJIB)
- Permissions are strictly enforced on the frontend through `usePermission()` hook in `AuthContext` dan komponen `ProtectedRoute`.
- **Module Keys:** `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`, `companyprofile`, dll.
- **Permission Levels:** `none` < `dashboard` < `read` < `crud`.
- **Navigation (`useFilteredNav`):** Sidebar items (`AdminLayout.tsx`) otomatis disembunyikan jika user tidak memiliki minimum level akses (`minLevel`) atau tidak ada di `page_permissions`.
- **Superadmin Bypass:** User dengan `is_superadmin=true` atau `user_type === 'superadmin'` bypass semua checking permission.
- **Tombol CRUD & Form:** Semua aksi/tombol (Tambah, Edit, Hapus) dan input form HANYA aktif dirender jika user punya `crud` pada modul terkait. Gunakan helper seperti `hasModuleAccess('modul', 'crud')` (atau JSX Wrapper `<Can module="..." level="crud">` / hook `useCan`). Jika permission hanya `read`, halaman bersifat read-only.
- **Backend Enforced:** Keamanan absolut selalu divalidasi juga oleh Backend API.

## Wave System (Gelombang) - Frontend Convention
**Gelombang adalah induk dari semua data operasional PPDB.** Data yang ditampilkan di halaman admin (pendaftar, dokumen, pembayaran, seleksi) selalu mengacu pada **gelombang yang sedang aktif**:
- Gelombang **aktif** → tampilkan data milik gelombang tersebut saja.
- Gelombang **tidak aktif / tidak ada yang aktif** → data tidak ditampilkan (tampil empty state + banner peringatan kuning "Aktifkan gelombang terlebih dahulu").
- **Ganti gelombang aktif** → data berganti ke data milik gelombang baru.
- Halaman registrasi publik memanggil `/ppdb/waves/active-public` di awal load untuk menentukan opsi jalur & jenjang yang tersedia, serta menyembunyikan yang dilarang.
- Badge `EXPIRED` untuk pendaftar lewat tenggat bayar tetap ditampilkan dengan warna **merah** (`destructive`) di tabel.

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
