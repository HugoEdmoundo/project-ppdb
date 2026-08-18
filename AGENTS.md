# PTDARRAHMAN Monorepo Documentation

Pesantren Tahfidz Qur'an dan Digital Ar-Rahman — A monorepo containing the company profile website, PPDB application, superadmin panel, and a unified API backend.

## Project Structure & Tech Stack

| Service | Path | Tech Stack | Deployment | Key Responsibilities |
| --- | --- | --- | --- | --- |
| **Company Profile** | `companyprofile/` | Next.js 16 (App Router), React 19, Tailwind v4 | Cloudflare Workers (OpenNext) | Public-facing website, news, programs, admin CMS dashboard. |
| **PPDB App** | `ppdb/` | Vite 8, React 19, Tailwind CSS v3 | Cloudflare Pages (Static) | Student registration, payment gateway wall, applicant dashboard, PPDB admin. |
| **Superadmin Panel**| `superadmin/` | Vite 5, React 18, Tailwind CSS v3 | Cloudflare Pages (Static) | System-wide users and roles management, modules access control. |
| **Backend API** | `api/` | FastAPI 0.141, Python 3.12, SQLAlchemy 2, MySQL | Vercel | Monolithic backend serving all three frontends. Handles DB, auth, SSE, and uploads. |

## Backend (`api/`)

A single FastAPI service handling all business logic, database operations, and authentication.

### Core Structure
- `src/core/`: Configuration, database connection, JWT security, SSE events, and Cloudinary uploads.
- `src/models/`: SQLAlchemy ORM models (e.g., `auth.py`, `ppdb.py`, `content.py`).
- `src/modules/`: Feature-based routers and schemas (`auth`, `companyprofile`, `modules`, `notifications`, `payment`, `ppdb`, `roles`, `superadmin`, `users`).
- `alembic/`: Database migrations. Use `alembic upgrade head` to apply.

### Key Conventions
- **Permissions**: Enforced via `src/core/dependencies.py`. Routers use dependencies like `Depends(require_ppdb_admin)`.
- **Soft Delete**: Applied to records like `ppdb_applicants` (`deleted_at`).
- **Real-time**: Handled via Server-Sent Events (SSE) in `src/core/events.py` (e.g., `/companyprofile/events`).
- **File Uploads**: Cloudinary integration for production, local storage for dev.

## Frontend Access Control
Permissions are defined per-module (`companyprofile`, `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`) with levels (`none` < `read` < `crud`).
- Buttons and forms must check permissions before rendering. Form inputs are disabled (read-only) if the user lacks `crud` access.
- **Superadmin Bypass**: Users with `user_type === 'superadmin'` bypass all module-level permission checks.
- System roles (`is_system=True`) like "Superadmin" and "Calon Murid" are protected from accidental deletion or modification.

## PPDB Flow
1. **Registration**: User registers -> receives `payment_status = 'pending'` and a 7-day `payment_deadline`. Nominal biaya pendaftaran (Tahap 1) ditarik otomatis dari konfigurasi `registration_fee` pada tabel `ppdb_waves` yang sedang aktif.
2. **Paywall**: Users with pending payments are restricted to `/checkout`. No dashboard access.
3. **Expiration**: If unpaid after 7 days, `payment_status` becomes `expired` and account is soft-deleted.
4. **Paid**: On success (manual or webhook), status becomes `paid` -> Dashboard is unlocked for document uploads. Khusus untuk pembayaran manual (offline), admin dapat **membatalkan konfirmasi** yang mengembalikan status user menjadi `pending` dan mengunci kembali dashboard. (Pembayaran online via gateway tidak bisa dibatalkan).

## Environment & Secrets
- Uses `.env` files for local development. Never commit secrets.
- Production uses Vercel/Cloudflare environment variables.

## Dynamic Branding (Frontend Rule)
- **Logo & Favicon** di semua frontend (PPDB, Superadmin) WAJIB diambil secara **dinamis** dari API via endpoint `/companyprofile/settings/{key}` (key: `logo`, `favicon`, `site_name`, dll).
- **⚠️ No Static Brand Assets:** Tidak ada file logo/favicon statis di project ini. Jangan pernah gunakan `<img src="/logo.png">` atau path statis lainnya.
- `settingsService.getLogo()` → GET `/companyprofile/settings/logo`
- `settingsService.getFavicon()` → GET `/companyprofile/settings/favicon`
- Perubahan brand tampil live via SSE (`/companyprofile/events`).

