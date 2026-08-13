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
- Production API base: `https://project-ppdb-murex.vercel.app` (fallback otomatis di `client.ts`/`api.ts` tiap FE ke `http://localhost:8000`).
- Detail deploy: `DEPLOY.md`.

## Backend (`api/`)

FastAPI monolitik satu service untuk ketiga frontend.

```
api/
  alembic/            # migrations DB (versions: 0001 baseline, 0002 ppdb v2)
  scripts/seed.py     # idempotent seeder (modules, pages, roles, superadmin, site_settings)
  src/
    core/             # config (pydantic-settings), database (engine/db), security (bcrypt+JWT),
                      #   dependencies (auth/permission guards), uploads (Cloudinary), events (SSE)
    models/           # SQLAlchemy models -> metadata baseline migration
    modules/          # auth, users, roles, superadmin, companyprofile, modules, ppdb (routers + schemas)
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
- Local dev: `cd api && .venv\Scripts\python.exe -m uvicorn src.main:app --reload --port 8000`.
- Test: `cd api && .venv\Scripts\python.exe -m pytest tests -q` (butuh DB live via `api/.env`).

### Skema PPDB v2
- `ppdb_periods`: `id, name, academic_year, description, status, start_date, end_date, created_at, updated_at`.
- `ppdb_waves`: `id, period_id, wave_number, name, registration_start_date, registration_end_date, document_upload_end_date, selection_date, quota, status, start_date, end_date, created_at, updated_at`.
- Kolom `start_date`/`end_date` sengaja nullable (tidak dipakai router; pertahankan jangan dihapus — dipakai integrasi lama).

## Aturan lintas-app: CRUD mengikuti permission
- Tombol CRUD hanya dirender jika user punya level `crud` pada modul (superadmin bypass). Enforce ada di backend, hide di FE hanya UX.
- Modul keys: `companyprofile`, `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`.

## Env & secrets
- `.env` / `.env.*` gitignored di root & `api/`. Jangan commit secret.
- Vercel env vars: lihat `DEPLOY.md`.
