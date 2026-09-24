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
| **WhatsApp Service** | `apps/whatsapp/` | Node.js 20, Express, whatsapp-web.js, BullMQ, Redis | WhatsApp notification microservice. Sends messages, manages session, queues delivery. |

### Workspace Layout
- `apps/*`: Deployable applications. **Frontend apps** (`companyprofile`, `ppdb`, `superadmin`) adalah pnpm workspace member. **`apps/whatsapp` DI-EXCLUDE dari pnpm workspace** — ia project Node/npm standalone (`package-lock.json`) yang berjalan di container sendiri (`whatsapp`), jadi `pnpm dev`/`pnpm build` TIDAK ikut menjalankannya.
- `packages/*`: Shared internal libraries — `ui` (shared React/Tailwind UI components) dan `typescript-config` (shared TypeScript/tsconfig presets).
- `pnpm-workspace.yaml`: Workspace globs — EKSPLISIT mencantumkan 3 frontend + 2 packages (tanpa `apps/whatsapp`).
- `turbo.json`: Task orchestration untuk `build`/`dev`/`lint`/`test`.
- `.pre-commit-config.yaml`: Pre-commit hooks (ruff, mypy, trailing-whitespace, etc.) installed on commit.
- `docker-compose.yml`: 3 container + Redis — `frontend` (Node/pnpm, UI only), `api` (FastAPI), `whatsapp` (Node/npm), `redis` (internal). Semua berjalan di Docker, **tidak ada Redis/servis lokal**.
- `docker/Dockerfile.frontend`: Multi-stage Dockerfile untuk container ui-container… → `frontend` (serves all three UIs).

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
- System roles (`is_system=True`) like "Superadmin" and "Pendaftar" are protected from accidental deletion or modification.

### User Types & Auth Rules

Ada tiga jenis user dalam sistem:

| User Type | Login Di | Dashboard | Aturan Khusus |
| --- | --- | --- | --- |
| `superadmin` | Superadmin Panel (`apps/superadmin`) | Superadmin panel saja | Bypass SEMUA pengecekan permission — selalu punya akses ke semua modul dan semua halaman |
| `admin` | PPDB (`apps/ppdb`) | `/admin/dashboard` | Diblokir login jika SEMUA module di role-nya = `none` |
| `applicant` | PPDB (`apps/ppdb`) | `/applicant` (bukan `/admin`) | Role "Pendaftar" bawaan system — tidak bisa akses admin dashboard PPDB |

### Superadmin
- `user_type === 'superadmin'` atau role dengan `is_superadmin = true` → **bypass semua pengecekan permission**.
- Role "Superadmin" bersifat sistem (`is_system=True`) — tidak bisa diedit atau dihapus.
- Role Superadmin tidak punya kolom permissions yang perlu diisi — mereka punya akses ke segalanya secara implisit.
- Superadmin hanya bisa login di Superadmin Panel, BUKAN di PPDB App.

### Admin (Dibuat oleh Superadmin)
- Login di PPDB App (`/auth/login`).
- Jika **semua module di role-nya = `none`** → **diblokir login** di backend dengan HTTP 403, pesan dimulai dengan prefix `module_disabled:`.
  - Frontend PPDB menampilkan alert: "Akses ditolak: semua modul dinonaktifkan oleh superadmin."
- Jika punya minimal 1 module bukan `none` → boleh login dan masuk ke `/admin/dashboard`.
- Permission page (halaman mana yang bisa diakses di sidebar) mengikuti `user_page_permissions` table — hanya page dari module yang punya akses yang muncul.

### Applicant (Pendaftar)
- Login di PPDB App (`/auth/login`).
- Role "Pendaftar" adalah role sistem (`is_system=True`) — tidak bisa diedit.
- Setelah login, hanya bisa mengakses `/applicant` (dashboard peserta) atau `/checkout` (paywall).
- **Tidak bisa** masuk ke `/admin/dashboard` atau halaman admin manapun.
- Tidak ada pengecekan module permission untuk applicant — mereka selalu diizinkan login (selama akun aktif).

### Routing Logic (PPDB ProtectedRoute & LoginPage)
Tidak ada "validasi mau masuk dashboard mana" — routing adalah **konsekuensi otomatis dari user_type**:

- **Post-login redirect** di LoginPage (`apps/ppdb`):
  - `user_type === 'superadmin'` atau `is_superadmin` → redirect ke `/admin/dashboard`
  - `user_type === 'admin'` dengan minimal 1 module bukan `none` → redirect ke `/admin/dashboard`
  - `user_type === 'applicant'` → redirect ke `/applicant`
  - Semua module `none` → **diblokir di backend sebelum sampai sini**

- **ProtectedRoute** (`apps/ppdb/src/components/ProtectedRoute.tsx`):
  - `role="admin"` → cek `isAdmin()` → true untuk superadmin atau admin dengan modul aktif
  - `role="applicant"` → cek `hasApplicantAccess()` → **hanya** true untuk `user_type === 'applicant'`
  - Tidak ada routing ke dashboard lain — setiap user langsung masuk ke tempat yang sesuai berdasarkan `user_type`-nya

- **isAdmin()** (`AuthContext.tsx`):
  - `user_type === 'superadmin'` atau `is_superadmin === true` → `true`
  - `user_type === 'applicant'` → `false`
  - Lainnya: `true` jika ada minimal 1 permission value bukan `none`

- **hasApplicantAccess()** (`AuthContext.tsx`):
  - Hanya `true` jika `user_type === 'applicant'`
  - Superadmin → `false` (tidak masuk ke /applicant, tapi ke /admin/dashboard)

### Permission Halaman (Page Permissions)
- Setiap halaman admin memiliki key unik (e.g. `dashboard`, `applicants`, `payments`).
- User hanya bisa melihat halaman yang ada di `user_page_permissions` mereka.
- Jika module dari sebuah halaman = `none`, halaman tersebut tidak akan muncul di permission list user tersebut.
- Superadmin tidak dicek via page permissions — mereka melihat semua halaman.

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

## Local Docker Runtime (WSL2)

Runbook lengkap & verbatim untuk AGENT AI: **`docs/DOCKER_SETUP.md`**. Jangan skip dokumen itu saat diminta "setup docker".

Ringkasan yang TIDAK BOLEH dilanggar:
- **DUA COPY REPO (sumber "ga update"):** Ada dua copy repo di mesin owner. Copy **Windows** (`C:\ptdarrahman.sch.id\project-ppdb`) adalah repo git asli tempat AGENT bekerja (edit/commit). Copy **WSL** (`/home/<user>/project-ppdb`, ext4, tanpa .git) adalah SATU-SATUNYA yang dipakai Docker build & run. **Alur update kode: edit di copy Windows → sync file ke copy WSL → `docker compose up -d --build` di copy WSL.** Jangan pernah build dari `/mnt/c` (sangat lambat) dan jangan heran kalau build dari copy WSL yang belum di-sync menghasilkan versi lama.
- **Docker engine MANUAL-START:** `docker.service`, `containerd.service`, `docker.socket` sengaja di-`disable` (owner menolak auto-start saat boot WSL). Setelah WSL boot / `wsl --shutdown`, wajib mulai manual: `wsl -e sudo systemctl start docker` lalu `docker compose up -d`.
- **WSL TIDAK boleh mati sendiri (idle):** `.wslconfig` owner wajib berisi `[general] instanceIdleTimeout=-1` DAN `[wsl2] vmIdleTimeout=-1` (nilai negatif = never). Tanpa pasangan ini, VM/distro mati sendiri ~70 detik setelah sesi `wsl.exe` terakhir ditutup → dockerd & semua container ikut mati. `vmIdleTimeout` saja atau nilai `2147483647` TIDAK cukup.
- **Docker engine jalan di DALAM WSL2** (Ubuntu), repo kerja di ext4 WSL (`/home/<user>/project-ppdb`), **bukan** di `/mnt/c` (sangat lambat). Tidak perlu Docker Desktop.
- Akses dari browser Windows via **IP VM WSL** (`wsl hostname -I`), bukan `localhost`. **Dilarang `networkingMode=mirrored`** — sudah diuji bentrok dengan publish port Docker.
- `docker-compose.yml` berisi ruas `dns: [8.8.8.8, 1.1.1.1]` di `api` & `whatsapp` dan redis `--maxmemory-policy noeviction` — **jangan dihapus** (perbaikan bug nyata).
- `apps/whatsapp/.env` wajib `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`; Dockerfile-nya `useradd --system --create-home`; `SessionManager.ts` memakai `--disable-crash-reporter`.
- Build args frontend: `{NEXT_PUBLIC,VITE}_API_URL` default `http://localhost:8080`, di-bake saat build — set `FRONTEND_*` ke `http://<vm-ip>:8080` bila integrasi API harus jalan dari browser Windows.
- Start/stop: `docker compose up -d` (tanpa perubahan kode) / `docker compose stop` / (mati total) `wsl --shutdown` dari PowerShell. **Update kode = `docker compose up -d --build` SEKALI cukup** (build + recreate + start), dari copy WSL setelah sync.
- WhatsApp QR discan dari panel Superadmin (render via QR JS); session persist di volume `wa_session`.

## Dynamic Branding (Frontend Rule)
- **Logo & Favicon** di semua frontend (PPDB, Superadmin) WAJIB diambil secara **dinamis** dari API via endpoint `/companyprofile/settings/{key}` (key: `logo`, `favicon`, `site_name`, dll).
- **⚠️ No Static Brand Assets:** Tidak ada file logo/favicon statis di project ini. Jangan pernah gunakan `<img src="/logo.png">` atau path statis lainnya.
- `settingsService.getLogo()` → GET `/companyprofile/settings/logo`
- `settingsService.getFavicon()` → GET `/companyprofile/settings/favicon`
- Perubahan brand tampil live via SSE (`/companyprofile/events`).

## WhatsApp Notification Microservice (`apps/whatsapp/`)

Node.js 20 + Express + whatsapp-web.js service untuk pengiriman notifikasi WhatsApp ke pendaftar PPDB.

### Architecture Overview

```
FastAPI (apps/api/)
    │
    ├── POST /api/messages/send  ──►  WhatsApp Microservice (apps/whatsapp/)
    │                                       │
    │                                       ├── BullMQ Queue (Redis)
    │                                       │       │
    │                                       │       └── Worker → whatsapp-web.js → WA
    │                                       │
    │                                       └── Webhook callback
    │
    └── POST /notifications/webhook/whatsapp  ◄── delivery status update
```

### Notification Events (PPDB Flow)

| Event Key | Trigger | Channel |
| --- | --- | --- |
| `registration_welcome` | Pendaftar baru register | WA + Email |
| `payment_reminder_day7` | H-7 deadline pembayaran | WA + Email |
| `payment_success` | Pembayaran dikonfirmasi | WA + Email |
| `payment_failed` | Pembayaran gagal | WA + Email |
| `payment_expired` | Akun expired (H-8 belum bayar) | WA + Email |
| `document_reminder_3days` | H-3 batas upload dokumen | WA + Email |
| `document_reminder_1day` | H-1 batas upload dokumen | WA + Email |
| `document_approved` | Dokumen disetujui admin | WA + Email |
| `document_rejected` | Dokumen ditolak admin | WA + Email |
| `selection_reminder_5days` | H-5 seleksi | WA + Email |
| `selection_reminder_1day` | H-1 seleksi | WA + Email |
| `selection_result` | Pengumuman hasil seleksi | WA + Email |

### Source Structure

```
apps/whatsapp/src/
├── config/
│   └── env.ts               # Zod env validation
├── lib/
│   ├── logger.ts            # Winston logger
│   ├── redis.ts             # Redis singleton + BullMQ connections
│   ├── database.ts          # MySQL2 pool
│   ├── phoneUtils.ts        # Indonesian phone normalization
│   └── retry.ts             # Exponential backoff + jitter
├── services/
│   ├── SessionManager.ts    # whatsapp-web.js session lifecycle
│   ├── TemplateService.ts   # Template loading + rendering (5min cache)
│   ├── AuditLogService.ts   # notification_logs CRUD
│   └── WebhookService.ts    # HMAC-signed callback ke FastAPI
├── queues/
│   └── messageQueue.ts      # BullMQ queue + priority + enqueue helpers
├── workers/
│   └── messageWorker.ts     # BullMQ worker (concurrency: 1, anti-ban)
├── middlewares/
│   ├── apiKeyAuth.ts        # Bearer/X-API-Key authentication
│   ├── rateLimiter.ts       # IP rate limiting (express-rate-limit)
│   ├── requestLogger.ts     # Morgan → Winston
│   └── errorHandler.ts      # Global error + Zod validation handler
├── routes/
│   ├── session.routes.ts    # Session mgmt + QR SSE
│   ├── message.routes.ts    # Send single/template/bulk + logs
│   ├── template.routes.ts   # Template CRUD
│   └── health.routes.ts     # Liveness + readiness probe
├── types/
│   └── index.ts             # Shared TypeScript types
├── app.ts                   # Express factory
└── server.ts                # Bootstrap + graceful shutdown
```

### API Endpoints

**Public (no auth):**
- `GET /health` — Liveness probe
- `GET /health/detailed` — Full readiness check (Redis, MySQL, WA session, queue)

**Protected (API Key required):**
- `GET /api/session` — Session status
- `POST /api/session/init` — Start/reconnect session
- `POST /api/session/logout` — Logout
- `DELETE /api/session` — Destroy session
- `GET /api/session/qr` — QR code via SSE (text/event-stream)
- `GET /api/session/qr/raw` — Raw QR string (one-shot; dirender frontend via library QR JS seperti qrcode.react, BUKAN gambar PNG)
- `POST /api/messages/send` — Send direct message
- `POST /api/messages/send-template` — Send via event template
- `POST /api/messages/bulk` — Bulk send (max 100)
- `GET /api/messages/queue` — Queue stats
- `GET /api/messages/logs` — Delivery logs (paginated)
- `GET /api/templates` — List templates
- `PUT /api/templates/:id` — Update template
- `POST /api/templates/cache/clear` — Invalidate template cache

### Retry Strategy

| Attempt | Delay | Jitter |
| --- | --- | --- |
| 1 | 5s | ±20% |
| 2 | 30s | ±20% |
| 3 | 2m | ±20% |
| 4 | 15m | ±20% |
| 5 (final) | 1h | ±20% |

Invalid phone numbers are NOT retried — immediately marked as `invalid_number`.

### Environment Variables (apps/whatsapp/.env)

Key variables (see `.env.example` for full list):
- `API_KEY` — Shared secret, min 32 chars
- `DB_*` — MySQL connection (shared database with FastAPI)
- `REDIS_*` — Redis connection (DB index 1)
- `WA_SESSION_PATH` — Path untuk simpan session WA (di-mount sebagai Docker volume)
- `WEBHOOK_URL` — FastAPI webhook endpoint URL
- `WEBHOOK_SECRET` — HMAC secret untuk verifikasi callback
- `WA_THROTTLE_PER_MINUTE` — Max pesan/menit yang dikirim ke WA (default: 20)

### FastAPI Integration

Di `apps/api/src/core/config.py`:
- `wa_service_url` — URL WA microservice
- `wa_service_api_key` — Harus sama dengan `API_KEY` di WA microservice
- `wa_webhook_secret` — Harus sama dengan `WEBHOOK_SECRET` di WA microservice

Di `apps/api/src/core/notif_service.py`:
- `send_notification(event_key, user_id, context)` — Kirim single notif
- `send_notifications(events, user_id)` — Kirim batch notif
- `send_custom_notifications(user_ids, channel, subject, body)` — Custom blast

### First Run Checklist

1. Copy `.env.example` → `.env` di `apps/whatsapp/`
2. Set `API_KEY`, `DB_*`, `REDIS_*`, `WEBHOOK_SECRET`
3. Set `WA_SERVICE_API_KEY` dan `WA_WEBHOOK_SECRET` di `apps/api/.env` (nilai sama)
4. Run `alembic upgrade head` untuk migration `0021_wa_notification_fields`
5. Start Redis: `docker compose up redis -d`
6. Start service: `cd apps/whatsapp && npm run dev`
7. Scan QR di `GET /api/session/qr` (SSE) atau `GET /api/session/qr/raw`
8. Tes kirim: `POST /api/messages/send` dengan API key

### Docker

```bash
# Start semua services
docker compose up -d

# Lihat QR code (scan sekali, session tersimpan di volume)
docker compose logs -f whatsapp
# atau dari panel Superadmin → WhatsApp (QR dirender via QR JS, bukan gambar PNG)

# Re-scan QR (setelah session expired)
docker compose exec whatsapp curl -X DELETE http://localhost:3100/api/session \
  -H "X-API-Key: <your-api-key>"
```


### Retry Strategy

| Attempt | Delay | Jitter |
| --- | --- | --- |
| 1 | 5s | ±20% |
| 2 | 30s | ±20% |
| 3 | 2m | ±20% |
| 4 | 15m | ±20% |
| 5 (final) | 1h | ±20% |

Invalid phone numbers are NOT retried — immediately marked as `invalid_number`.

### Environment Variables (apps/whatsapp/.env)

Key variables (see `.env.example` for full list):
- `API_KEY` — Shared secret, min 32 chars
- `DB_*` — MySQL connection (shared database with FastAPI)
- `REDIS_*` — Redis connection (DB index 1)
- `WA_SESSION_PATH` — Path untuk simpan session WA (di-mount sebagai Docker volume)
- `WEBHOOK_URL` — FastAPI webhook endpoint URL
- `WEBHOOK_SECRET` — HMAC secret untuk verifikasi callback
- `WA_THROTTLE_PER_MINUTE` — Max pesan/menit yang dikirim ke WA (default: 20)

### FastAPI Integration

Di `apps/api/src/core/config.py`:
- `wa_service_url` — URL WA microservice
- `wa_service_api_key` — Harus sama dengan `API_KEY` di WA microservice
- `wa_webhook_secret` — Harus sama dengan `WEBHOOK_SECRET` di WA microservice

Di `apps/api/src/core/notif_service.py`:
- `send_notification(event_key, user_id, context)` — Kirim single notif
- `send_notifications(events, user_id)` — Kirim batch notif
- `send_custom_notifications(user_ids, channel, subject, body)` — Custom blast

### First Run Checklist

1. Copy `.env.example` → `.env` di `apps/whatsapp/`
2. Set `API_KEY`, `DB_*`, `REDIS_*`, `WEBHOOK_SECRET`
3. Set `WA_SERVICE_API_KEY` dan `WA_WEBHOOK_SECRET` di `apps/api/.env` (nilai sama)
4. Run `alembic upgrade head` untuk migration `0021_wa_notification_fields`
5. Start Redis: `docker compose up redis -d`
6. Start service: `cd apps/whatsapp && npm run dev`
7. Scan QR di `GET /api/session/qr` (SSE) atau `GET /api/session/qr/raw`
8. Tes kirim: `POST /api/messages/send` dengan API key

### Docker

```bash
# Start semua services
docker compose up -d

# Lihat QR code (scan sekali, session tersimpan di volume)
docker compose logs -f whatsapp
# atau dari panel Superadmin → WhatsApp (QR dirender via QR JS, bukan gambar PNG)

# Re-scan QR (setelah session expired)
docker compose exec whatsapp curl -X DELETE http://localhost:3100/api/session \
  -H "X-API-Key: <your-api-key>"
```
