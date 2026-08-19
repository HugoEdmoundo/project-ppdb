# Deploy (Production)

Arsitektur produksi:

| App | Target | Cara |
| --- | --- | --- |
| `companyprofile` | Cloudflare Workers (OpenNext) | `npm run deploy` |
| `ppdb` | Cloudflare Pages (static) | git / `wrangler pages deploy` |
| `superadmin` | Cloudflare Pages (static) | git / `wrangler pages deploy` |
| `api` | Vercel (FastAPI) | Vercel dashboard / `vercel --prod` |

Production API URL: **https://api-lime-zeta-22.vercel.app**

---

## `api` → Vercel

Sudah ter-deploy di https://api-lime-zeta-22.vercel.app. Untuk update, deploy ulang folder `api` (Vercel project root directory = `api/`). Vercel mendeteksi FastAPI otomatis (entrypoint `src/main.py`, variabel `app`).

- **Dokumentasi API**: `/scalar` (Swagger `/docs` & `/redoc` sengaja dimatikan).
- **Favicon**: route `/favicon.ico` dibalikin SVG, tidak 404 lagi.
- **Config file**: `vercel.json` (maxDuration 60s, exclude `__pycache__`), `.python-version` (3.12), `.vercelignore`.
- **CORS**: dibaca dari env `CORS_ORIGINS` (koma-koma). Default `*` bila kosong; tutup dengan domain Cloudflare final.
- **Migrasi DB**: jalankan sekali sebelum/tiap deploy — `cd api && .venv\Scripts\alembic.exe upgrade head` (migrations idempotent/add-only, aman untuk live DB).
- **Seeder**: `cd api && .venv\Scripts\python.exe -m scripts.seed` (idempotent; membuat modules/pages/roles, dan memastikan superadmin sesuai `SEED_SUPERADMIN_*`).

### Env vars (Vercel dashboard → Settings → Environment Variables)
```
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=ptdarrahman
MYSQL_SSL=true|false
JWT_SECRET=...
JWT_EXPIRY_HOURS=24
CORS_ORIGINS=https://ptdarrahman.sch.id,https://ppdb.ptdarrahman.sch.id,...

# Uploads (file upload -> Cloudinary, bukan disk lokal)
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=ptdarrahman

# Seeder superadmin bootstrap
SEED_SUPERADMIN_USERNAME=superadmin
SEED_SUPERADMIN_PASSWORD=...
SEED_SUPERADMIN_EMAIL=...
```

> Provider upload `local` (`UPLOAD_PROVIDER=local`, `UPLOAD_DIR=uploads`) hanya untuk dev — Vercel serverless punya disk ephemeral, jangan dipakai produksi.

---

## `companyprofile` → Cloudflare Workers (OpenNext)

Next.js 16 di-deploy via `@opennextjs/cloudflare` (next-on-pages deprecated). Di-deploy manual:

```bash
cd companyprofile
npm install
npm run deploy        # opennextjs-cloudflare build && deploy
npm run preview       # build + preview lokal (Workers runtime)
```

Config: `wrangler.jsonc`, `public/_headers` (cache static). `.open-next/` di-gitignore.

**Env vars build time** (di dashboard Worker / CI, bukan runtime): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PORTAL_URL` — karena NEXT_PUBLIC_ di-inline saat build.

Opsional (kapan perlu):
- Image optimization → Cloudflare Images binding (buka comment `"images"` di `wrangler.jsonc`).
- Next.js cache → Cloudflare R2 bucket binding `NEXT_INC_CACHE_R2_BUCKET`.

> ⚠️ Route `/api/contact` pakai `nodemailer` (SMTP Gmail). Validasi dulu apakah jalan di Workers runtime (perlu `socket`/TLS). Kalau gagal, pindahkan ke email provider via HTTP API (Resend — env `RESEND_API_KEY` sudah ada di `.env.example`).

---

## `ppdb` & `superadmin` → Cloudflare Pages

Vite SPA, static. Sudah ada `wrangler.toml` (`pages_build_output_dir = "dist"`) dan `public/_redirects` (SPA fallback + favicon).

Via dashboard Cloudflare Pages (connect GitHub, root dir = folder app):
- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://api-lime-zeta-22.vercel.app`

Atau via CLI (jika mau):
```bash
cd ppdb && npm run build && npx wrangler pages deploy
cd superadmin && npm run build && npx wrangler pages deploy
```

---

## Catatan error browser

- `content.js ... useCache`, `polyfill.js ... Could not establish connection` → **noise dari extension browser** (bukan app ini).
- `/favicon.ico 404` → sudah diperbaiki di semua app (api route SVG, companyprofile `app/favicon.ico`, ppdb/superadmin redirect di `_redirects`).
