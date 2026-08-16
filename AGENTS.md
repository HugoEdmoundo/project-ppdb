# PTDARRAHMAN Monorepo

Pesantren Tahfidz Qur'an dan Digital Ar-Rahman — website company profile, aplikasi PPDB, dan panel superadmin.

## Stack ringkas

| App | Stack | Deploy | Route prefix API |
| --- | --- | --- | --- |
| `companyprofile/` | Next.js 16 (App Router) + TypeScript + Tailwind v4 | Cloudflare Workers (OpenNext) | `/companyprofile/*` (+ `/companyprofile/auth/*` untuk login CP) |
| `ppdb/` | Vite + React 19 + TypeScript + Tailwind | Cloudflare Pages (static) | `/ppdb/*`, `/auth/*` |
| `superadmin/` | Vite + React 18 + TypeScript + Tailwind | Cloudflare Pages (static) | `/users/*`, `/roles/*`, `/modules/*`, `/superadmin/*` |
| `api/` | FastAPI (Python 3.12) + SQLAlchemy + Alembic + MySQL | Vercel (root dir `api/`) | semua hal di atas |

- DB: MySQL di Hostinger. Akses lewat env di `api/.env` (gitignored; contoh: `api/.env.example`).
- Production API base: `https://project-ppdb-murex.vercel.app`. Tiap FE (`client.ts`/`api.ts`): `PRIMARY_API` dibaca dari env (`VITE_API_URL`/`NEXT_PUBLIC_API_URL`; saat dev = `http://localhost:8000`), otomatis fallback ke produksi bila primary gagal/5xx.
- Detail deploy: `DEPLOY.md`.

## Backend (`api/`)

FastAPI monolitik satu service untuk ketiga frontend.

```
api/
  alembic/            # migrations DB (versions: 0001 baseline, 0002 ppdb v2, 0003 payment+notif+softdelete)
  scripts/seed.py     # idempotent seeder (modules, pages, roles, superadmin, site_settings, notif templates)
  src/
    core/             # config (pydantic-settings), database (engine/db), security (bcrypt+JWT),
                      #   dependencies (auth/permission guards), uploads (Cloudinary), events (SSE),
                      #   notifications (notif_service.py — send email/WA, render template vars)
    models/           # SQLAlchemy models -> metadata baseline migration
    modules/          # auth, users, roles, superadmin, companyprofile, modules, ppdb,
                      #   payment (ppdb payment transactions), notifications (templates + logs)
  tests/              # smoke tests (pytest + TestClient, read-only + auth flow)
  requirements.txt    # pinned deps
  Dockerfile          # python:3.12-slim, uvicorn src.main:app
  vercel.json         # entrypoint src/main.py (fastapi)
```

### Konvensi backend
- Semua auth/permission guard di `src/core/dependencies.py`. Router TIDAK boleh define dependency auth sendiri.
- Endpoint publik: `/health`, `/scalar` (docs), `/companyprofile/*` (read), `/ppdb/register`.
- `require_*` helper dipakai sebagai dependency langsung: `user: dict = Depends(require_ppdb_admin)` (tanpa kurung). Jangan ubah ke pola `require_module_access(...)` kecuali via factory `require_cp_crud()`.
- Upload file → Cloudinary (`UPLOAD_PROVIDER=cloudinary`, config `cloudinary_*` di `.env`). Provider lokal (`local`) untuk dev.
- Real-time: SSE hub `companyprofile_hub` di `src/core/events.py` → endpoint `/companyprofile/events` (dipakai `companyprofile/app/hooks/useSSE.ts`). Bukan WebSocket, bukan Postgres.
- Migrasi skema DB via Alembic. Jangan edit live DB manual. Jalankan: `cd api && .venv\Scripts\alembic.exe upgrade head`.
- Seeder: `cd api && .venv\Scripts\python.exe -m scripts.seed` (idempotent; reset password superadmin sesuai `SEED_SUPERADMIN_*` bila mismatch).
- Role Sistem: Role dengan `is_system=True` (Superadmin, Calon Murid) dilindungi di backend, tidak bisa diedit/dihapus via endpoint CRUD roles.
- Local dev: `cd api && .venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000`.
- Test: `cd api && .venv\Scripts\python.exe -m pytest tests -q` (butuh DB live via `api/.env`).

### Skema PPDB v2 (masih berlaku)
- `ppdb_periods`: `id, name, academic_year, description, status, start_date, end_date, created_at, updated_at`.
- `ppdb_waves`: `id, period_id, wave_number, name, registration_start_date, registration_end_date, document_upload_end_date, selection_date, quota, status, start_date, end_date, created_at, updated_at`.
- Kolom `start_date`/`end_date` sengaja nullable (tidak dipakai router; pertahankan jangan dihapus — dipakai integrasi lama).

### Skema PPDB v3 (Migration 0003 — payment + notif + soft delete)

**`ppdb_applicants`** — tambahan kolom:
- `payment_status` VARCHAR(20) DEFAULT 'pending' — `pending | paid | failed | expired`
- `payment_deadline` DATETIME(3) NULL — diisi saat register = created_at + 7 hari
- `deleted_at` DATETIME(3) NULL — soft delete: NULL = aktif, ada value = expired/deleted

**`ppdb_payment_transactions`** — transaksi pembayaran formulir PPDB:
- `id, applicant_id (FK), method (offline|online), amount, status (pending|success|failed|expired|cancelled)`
- `external_id` (ref PG), `gateway_payload` (JSON webhook), `failure_reason`, `proof_url`
- `confirmed_by, confirmed_at` (untuk konfirmasi manual admin), `notes, created_at, updated_at`

**`notification_templates`** — template notif customizable per event:
- `event_key` (UNIQUE): `welcome | payment_reminder | payment_reminder_d7 | payment_success | payment_failed | payment_expired | document_reminder_d3 | document_reminder_d1 | document_approved | document_rejected | selection_reminder_d5 | selection_reminder_d1 | selection_result`
- `label, channel (email|whatsapp|both), email_subject, body (Text), is_active`
- Body mendukung variabel: `{nama_peserta}`, `{username}`, `{password}`, `{link_login}`, `{batas_waktu_bayar}`, `{nama_gelombang}`, `{tanggal_seleksi}`, `{alasan_penolakan}`, `{link_pembayaran}`, `{nominal_bayar}`

**`notification_logs`** — log setiap percobaan kirim:
- `id, template_id (FK NULL), event_key, recipient_user_id (FK NULL)`
- `recipient_name, recipient_email, recipient_phone, channel, subject_sent, body_sent`
- `status (pending|sent|failed), error_message, sent_at, created_at`

### Alur PPDB & Paywall Logic
- Setelah register → `payment_status = pending`, `payment_deadline = NOW() + 7 days`.
- Login guard: jika `payment_status != paid` **DAN** `deleted_at IS NULL` → redirect paksa ke `/checkout` (paywall). Tidak ada navbar/menu lain.
- Hari ke-8 belum bayar → cron job: `deleted_at = NOW()`, `payment_status = expired`. User tidak bisa login. Admin tetap bisa lihat data di tab Expired.
- Pembayaran berhasil (manual admin atau webhook PG) → `payment_status = paid`, `status = document_uploaded_pending` → unlock dashboard upload dokumen.
- Webhook PG FAILED/DENIED/EXPIRED → `payment_status = failed` pada transaksi, kirim notif email+WA.

### Status alur `ppdb_applicants.status`
`pending_payment` → `paid` → `document_uploaded` → `document_approved` / `document_rejected` → `selection` → `passed` / `failed` / `expired`

## Aturan lintas-app: CRUD mengikuti permission
- Tombol CRUD hanya dirender jika user punya level `crud` pada modul (superadmin bypass). Enforce ada di backend, hide di FE hanya UX.
- Modul keys: `companyprofile`, `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`.

## Env & secrets
- `.env` / `.env.*` gitignored di root & `api/`. Jangan commit secret.
- Vercel env vars: lihat `DEPLOY.md`.
- Env vars notifikasi (menyusul): `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `WA_PROVIDER`, `WA_API_KEY` (placeholder, belum aktif).
