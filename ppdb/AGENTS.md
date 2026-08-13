# PPDB - PTDARRAHMAN

Aplikasi Penerimaan Peserta Didik Baru (Vite + React + TypeScript + Tailwind) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- Vite + React + TypeScript
- Tailwind CSS, lucide-react, shadcn-style UI components (`src/components/ui`)
- Deploy: Cloudflare Pages (static)
- API: `src/api/client.ts` (fetch wrapper + JWT auto-refresh), services di `src/services`

## Backend
- Backend = FastAPI monolitik di `../api/` (bukan folder `backend/`, bukan Hono).
- PPDB API di `/ppdb/*` (`/ppdb/periods`, `/ppdb/waves`, `/ppdb/applicants`, `/ppdb/dashboard/stats`, `/ppdb/register` publik).
- Auth (login calon murid & admin): `/auth/*`.
- Skema PPDB v2: lihat `../api/alembic/versions/0002_ppdb_v2.py` (kolom `academic_year`/`description` di periode; `registration_start_date`/`registration_end_date`/`document_upload_end_date`/`selection_date`/`quota` di wave).

## Routes
- `/auth/login`, `/auth/register`
- `/admin` — dashboard admin PPDB (AdminLayout + AdminDashboardPage)
- `/403`, `*` — error pages

## ATURAN WAJIB: Tombol CRUD mengikuti permission

Semua tombol CRUD (Tambah/Buat/Edit/Ubah/Hapus/Simpan, kolom "Aksi") HANYA dirender jika user punya `crud` pada modul terkait. `read` = tampil data saja (read-only), form wajib di-disable.

- Gunakan helper permission:
  - `const { canCrud } = useCan('ppdb', 'crud')` (dari `src/hooks/useCan.ts`) lalu `{canCrud && <Button .../>}`
  - atau JSX wrapper: `<Can module="ppdb" level="crud"><Button .../></Can>` (dari `src/components/Permission.tsx`)
- Level modul yang berlaku: `none < dashboard < read < crud`
- Modul keys: `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`, `companyprofile`
- `is_superadmin` selalu bypass.
- Enforce keamanan ada di backend (`require_ppdb_admin` di `src/core/dependencies.py`); jangan andalkan frontend saja.

## Permission plumbing
- `usePermission()` di `src/contexts/AuthContext.tsx` → `hasModuleAccess(module, level)`, `isAdmin()`, `hasApplicantAccess()`, `pagePermissions`, `permissions`, `isSuperadmin`.
- `useFilteredNav(items)` → filter menu sidebar by modul permission + `page_permissions` (AuthContext.tsx).
- `AuthProvider` auto-refresh `/auth/me` tiap 30 detik, jadi perubahan permission langsung berefek tanpa login ulang.
- Backend mengirim `permissions` (module→level) dan `page_permissions` di login & `/auth/me`.

## Build
- `npm run dev` — dev server (Vite)
- `npm run build` — `tsc -b && vite build`
- `npm run preview`
