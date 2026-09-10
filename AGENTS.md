# PTDARRAHMAN Monorepo Documentation

Pesantren Tahfidz Qur'an dan Digital Ar-Rahman — A monorepo containing the company profile website, PPDB application, superadmin panel, and a unified API backend.

## Project Structure & Tech Stack

Managed as a **pnpm workspace + Turborepo** monorepo. Run cross-package scripts from the repo root (e.g. `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`) which delegate to `turbo`.

| Service | Path | Tech Stack | Key Responsibilities |
| --- | --- | --- | --- |
| **Company Profile** | `apps/companyprofile/` | Next.js 16 (App Router), React 19, Tailwind v4 | Public-facing website, news, programs, admin CMS dashboard. |
| **PPDB App** | `apps/ppdb/` | Vite 8, React 19, Tailwind CSS v3 | Student registration, payment gateway wall, applicant dashboard, PPDB admin. |
| **Superadmin Panel**| `apps/superadmin/` | Vite 8, React 19, Tailwind CSS v3 | System-wide users and roles management, modules access control. |
| **Backend API** | `apps/api/` | FastAPI 0.141, Python 3.12, SQLAlchemy 2, MySQL | Monolithic backend serving all three frontends. Handles DB, auth, SSE, and uploads. |

### Workspace Layout
- `apps/*`: Deployable applications (the four services above).
- `packages/*`: Shared internal libraries — `ui` (shared React/Tailwind UI components), `types`, `utils`, `typescript-config`, `eslint-config`, `database`.
- `pnpm-workspace.yaml`: Workspace globs (`apps/*`, `packages/*`).
- `turbo.json`: Task orchestration for `build`/`dev`/`lint`/`test`.
- `.pre-commit-config.yaml`: Pre-commit hooks (ruff, mypy, trailing-whitespace, etc.) installed on commit.

## Backend (`apps/api/`)

A single FastAPI service handling all business logic, database operations, and authentication.

### Core Structure
- `src/core/`: Configuration, database connection, JWT security, dependencies (permissions), SSE events.
- `src/models/`: SQLAlchemy ORM models (e.g., `auth.py`, `ppdb.py`, `content.py`, `selection.py`).
- `src/modules/`: Feature-based routers and schemas (`auth`, `companyprofile`, `modules`, `notifications`, `payment`, `ppdb`, `roles`, `selection`, `superadmin`, `uploads`, `users`).
- `alembic/`: Database migrations. Use `alembic upgrade head` to apply.

### Key Conventions
- **Permissions**: Enforced via `src/core/dependencies.py`. Routers use dependencies like `Depends(require_ppdb_admin)`. Access levels include `none`, `dashboard`, `read`, and `crud`.
- **Soft Delete**: Applied to records like `ppdb_applicants` (`deleted_at`).
- **Real-time**: Handled via Server-Sent Events (SSE) in `src/core/events.py`.
- **File Uploads**: Local storage handled under the `uploads` module.

## Frontend Access Control
Permissions are defined per-module (e.g., `companyprofile`, `ppdb`, `dashboard`) with levels (`none` < `dashboard` < `read` < `crud`).
- Buttons and forms must check permissions before rendering. Form inputs are disabled (read-only) if the user lacks `crud` access.
- **Superadmin Bypass**: Users with `user_type === 'superadmin'` bypass all module-level permission checks.
- System roles (`is_system=True`) like "Superadmin" and "Pendaftar" are protected from accidental deletion or modification.

## PPDB Flow
1. **Registration**: User registers -> receives `payment_status = 'pending'` and a 7-day `payment_deadline`. Nominal biaya pendaftaran (Tahap 1) ditarik otomatis dari konfigurasi `registration_fee` pada tabel `ppdb_waves` yang sedang aktif.
2. **Paywall**: Users with pending payments are restricted to `/checkout`. No dashboard access.
3. **Expiration**: If unpaid after 7 days, `payment_status` becomes `expired` and account is soft-deleted (`deleted_at` is set). Expired applicants **tetap tampil** di list admin dengan badge merah "EXPIRED" — tidak dihapus dari tampilan.
4. **Paid (Tahap 1)**: On success (manual or webhook), status becomes `paid` -> Dashboard is unlocked for document uploads. Khusus untuk pembayaran manual (offline), admin dapat **membatalkan konfirmasi** yang mengembalikan status user menjadi `pending` dan mengunci kembali dashboard. (Pembayaran online via gateway tidak bisa dibatalkan).
5. **Selection & MOU**: Setelah lulus, admin memunculkan MOU dan biaya Tahap 2 (Daftar Ulang) beserta diskon/cicilan (Tabel `ppdb_applicant_discounts` & `ppdb_stage2_bills`).

## Wave System (Gelombang)

### Hierarki
`Periode` → `Gelombang` → `Pendaftar/Transaksi/Dokumen/Seleksi/Biaya Tahap 2`

Pendaftaran hanya bisa dilakukan jika **tepat 1 Periode DAN 1 Gelombang** berstatus `active` secara bersamaan.

### Gelombang sebagai Induk Data
**Gelombang adalah induk dari semua data operasional PPDB.** Data yang ditampilkan di halaman admin (pendaftar, dokumen, pembayaran, seleksi) selalu mengacu pada **gelombang yang sedang aktif**:
- Gelombang **aktif** → tampilkan data milik gelombang tersebut saja.
- Gelombang **tidak aktif / tidak ada yang aktif** → data tidak ditampilkan (tampil empty state + banner peringatan kuning).
- **Ganti gelombang aktif** → data berganti ke data milik gelombang baru.

### Aturan Aktivasi (Business Logic)
- Hanya **1 wave aktif secara global** (system-wide, bukan per-periode).
- Wave hanya bisa diaktifkan jika **periode induknya `active`** → HTTP 400 jika belum.
- **Aktivasi wave** → nonaktifkan SEMUA wave lain dulu, baru aktifkan ini.
- **Aktivasi periode** → nonaktifkan SEMUA wave dari SEMUA periode.
- **Deaktivasi periode** → nonaktifkan wave dari periode itu saja.
- **Membuat wave** → selalu `inactive`, tidak bisa langsung aktif.
- **Hapus periode** → cascade hapus semua waves-nya.
- **Hapus wave yang ada pendaftarnya** → **diblok** (FK RESTRICT).

### API Wave-Scoping (Backend Convention)
- **`GET /ppdb/applicants`** — jika tidak ada `wave_id` param, backend **otomatis resolve ke wave aktif**. Jika tidak ada wave aktif → return `{data: [], total: 0, active_wave: null}`.
- **`GET /payment/transactions`** — backend scope ke wave aktif via JOIN ke `ppdb_applicants.wave_id`. Jika tidak ada wave aktif → return kosong.
- **`GET /selection/sessions|categories|results`** — backend scope ke wave aktif via helper `_get_active_wave_id()`.
- **`GET /ppdb/waves/active-public`** — endpoint publik (no auth), return info wave aktif (`id`, `name`, `allowed_paths[]`, `allowed_levels[]`) atau `{active: false}`. Dipakai halaman registrasi publik.

### Frontend Wave-Scoping (Frontend Convention)
- Semua halaman admin data (`DataPendaftarPage`, `ApplicantsPage`, `PaymentsPage`, `SelectionPage`) hanya menampilkan data dari **gelombang aktif**.
- Jika API mengembalikan `active_wave: null` → tampilkan **banner kuning** dan **empty state** dengan pesan "Aktifkan gelombang terlebih dahulu".
- Halaman registrasi publik memanggil `/ppdb/waves/active-public` di awal load untuk menentukan opsi jalur & jenjang yang tersedia.

### Scope Gelombang (allowed_paths / allowed_levels)
- `allowed_paths`: CSV dari `reguler`, `pindahan` — menentukan jalur pendaftaran yang dibuka.
- `allowed_levels`: CSV dari `SMP`, `SMK` — menentukan jenjang yang dibuka.
- Form registrasi publik **otomatis menyembunyikan** opsi yang tidak diizinkan wave aktif.
- Backend juga **memvalidasi ulang** saat POST register (double validation).

### Expired Applicants (Soft Delete)
- Cron job harian (`POST /ppdb/cron/soft-delete-expired`) men-set `deleted_at`, `payment_status = 'expired'`, `status = 'expired'` pada pendaftar yang melewati `payment_deadline`.
- Pendaftar expired **tetap muncul** di list admin selama gelombangnya aktif — tidak disembunyikan.
- Badge `EXPIRED` selalu ditampilkan dengan warna **merah** (`destructive`) — baik di tabel maupun di modal detail — bukan kuning.

## Environment & Secrets
- Uses `.env` files for local development. Never commit secrets.
- Every app reads its own `.env` from its directory (`apps/api/.env`, `apps/ppdb/.env`, etc.). No secrets are shared across the repo.

## Tooling & Workflows
- **Package manager**: `pnpm` (workspace root). Frontend deps are hoisted via `pnpm-lock.yaml`.
- **Orchestration**: `turbo` — run `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm test` from the repo root to execute across all workspace packages.
- **Shared UI**: `packages/ui` exports reusable React/Tailwind components; apps import from `@repo/ui` rather than maintaining duplicates.
- **Python/API**: `apps/api` uses ruff + mypy (see `.pre-commit-config.yaml`) and runs on Python 3.12 with its own dependency files.

## Dynamic Branding (Frontend Rule)
- **Logo & Favicon** di semua frontend (PPDB, Superadmin) WAJIB diambil secara **dinamis** dari API via endpoint `/companyprofile/settings/{key}` (key: `logo`, `favicon`, `site_name`, dll).
- **⚠️ No Static Brand Assets:** Tidak ada file logo/favicon statis di project ini. Jangan pernah gunakan `<img src="/logo.png">` atau path statis lainnya.
- `settingsService.getLogo()` → GET `/companyprofile/settings/logo`
- `settingsService.getFavicon()` → GET `/companyprofile/settings/favicon`
- Perubahan brand tampil live via SSE (`/companyprofile/events`).
