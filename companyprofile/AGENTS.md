# Company Profile - PTDARRAHMAN

Main public website + admin dashboard for Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- Next.js 16 (App Router) + Turbopack, Tailwind CSS v4, TypeScript, lucide-react, framer-motion
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare`

## Routes
- `/` — Home
- `/about`, `/news`, `/news/[slug]`, `/programs`, `/programs/[slug]`
- `/facilities`, `/achievements`, `/gallery`, `/staff`, `/contact`
- `/ppdb` — halaman PPDB (landing/coming soon, link ke portal `ppdb.ptdarrahman.sch.id`)
- `/auth` — Student/parent portal login
- `/admin` — redirect (ke dashboard bila ada token, ke login bila belum)
- `/admin/login`, `/admin/dashboard` — CRUD dashboard

## Key Conventions
- Route group: `app/(main)/` contains pages with Navbar/Footer
- Root `app/layout.tsx` is minimal (html/body/globals.css)
- Error pages render without Navbar
- All imports use `@/app/...` path alias

## Backend & API
- Backend = FastAPI monolitik (`../api/`), bukan Postgres/Hono.
- Public API via `GET /companyprofile/{table}`.
- Admin CRUD via `POST/PUT/DELETE /companyprofile/{table}[/{id}]`.
- Auth: login di `/companyprofile/auth/login`; token key localStorage: `admin_token`, user key: `admin_user`.
- Real-time: `useSSE.ts` (EventSource) subscribe `/companyprofile/events` — SSE hub server-side, bukan WebSocket/Postgres channel.

## Admin Dashboard
- 9 CRUD tabs: news, programs, facilities, staff, achievements, gallery, testimonials, social, contact.
- Upload file lewat `/companyprofile/upload` (diteruskan ke Cloudinary oleh backend).

### ATURAN WAJIB: Tombol CRUD mengikuti permission
- `const canCrud = adminUser?.user_type === 'superadmin' || adminUser?.permissions?.companyprofile === 'crud'` (`app/admin/dashboard/page.tsx`)
- Semua tombol Buat/Edit/Hapus, kolom "Aksi", dan form (SettingsEditor/ContactEditor) digate `canCrud`; form di-disable bila `!canCrud` (read-only).
- `adminUser` diambil dari localStorage `admin_user` (diisi saat login dari `data.user.permissions`) atau via `api.getMe()`.
- Backend tetap enforce permission; hiding di frontend hanya UX.

## Hooks
- `useFocusTrap(open, onClose?)` — focus trap + Escape key + role=dialog for modals
- `useSSE()` — subscribe perubahan content real-time (EventSource ke `/companyprofile/events`)

## Components
- `AdminConfirm` — reusable confirm dialog (danger/default variant), triggered via `confirm()`
- `ProfileModal` — edit profile (username, email, avatar upload/URL, password change)

## Build
- `npm run dev` — port 3000
- `npm run lint` — ESLint with --cache
- `npm run build` — Next.js build
- `npm run preview` / `npm run deploy` — OpenNext Cloudflare Worker (build + preview/deploy)
