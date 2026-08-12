# PPDB - PTDARRAHMAN

Aplikasi Penerimaan Peserta Didik Baru (Vite + React + TypeScript + Tailwind) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

> ⚠️ **BACA DOKUMENTASI BARU DULU** — project PPDB sedang **rebuild dari nol** (model Periode → Gelombang).
> Dokumentasi terbaru (source of truth): `README.md`, `PRD.md`, `FLOW.md`, `ERD.md`, `plan/PLAN.md`.
> Semua dokumen lama sudah dipindah ke `archive/` dan **OBSOLETE** — jangan dibaca untuk kebutuhan teknis.

## Stack
- Vite + React 18 + TypeScript
- Tailwind CSS, lucide-react, shadcn-style UI components (`src/components/ui`)
- API: `src/api/client.ts` (fetch wrapper + JWT auto-refresh), services di `src/services`

## Routes (saat ini)
- `/auth/login`, `/auth/register`
- `/admin` — dashboard admin PPDB (AdminLayout + AdminDashboardPage)
- `/403`, `*` — error pages

> Catatan: halaman CRUD (Periods, Waves, Applicants, Documents, Payments, Selection, dll.) belum dibangun. Route yang dipakai tombol quick action di dashboard (`/admin/applicants`, `/admin/payments`, dst.) masih 404.

## Status backend & iterasi saat ini

- Backend PPDB lama **dihapus total** dan dibangun ulang. Iterasi pertama = **modul Periode & Gelombang** (config) di `backend/`.
- Model & aturan aktivasi: lihat `PRD.md` (ID) & `FLOW.md`. Skema DB: `ERD.md` (EN). Rencana implementasi: `plan/PLAN.md` (EN).
- Backend stack aktual: **Hono (Bun/TypeScript) + MySQL** di folder `backend/` (bukan Python FastAPI).

## ATURAN WAJIB: Tombol CRUD mengikuti permission

Semua tombol CRUD (Tambah/Buat/Edit/Ubah/Hapus/Simpan, kolom "Aksi") HANYA dirender jika user punya `crud` pada modul terkait. `read` = tampil data saja (read-only), form wajib di-disable.

- Gunakan helper permission:
  - `const { canCrud } = useCan('ppdb', 'crud')` (dari `src/hooks/useCan.ts`) lalu `{canCrud && <Button .../>}`
  - atau JSX wrapper: `<Can module="ppdb" level="crud"><Button .../></Can>` (dari `src/components/Permission.tsx`)
- Level modul yang berlaku: `none < dashboard < read < crud`
- Modul keys: `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`, `companyprofile`
- `is_superadmin` selalu bypass.
- Enforce keamanan ada di backend (`requireModuleAccess`); jangan andalkan frontend saja.

## Permission plumbing
- `usePermission()` di `src/contexts/AuthContext.tsx` → `hasModuleAccess(module, level)`, `isAdmin()`, `hasApplicantAccess()`, `pagePermissions`, `permissions`, `isSuperadmin`.
- `useFilteredNav(items)` → filter menu sidebar by modul permission + `page_permissions` (AuthContext.tsx).
- `AuthProvider` auto-refresh `/auth/me` tiap 30 detik, jadi perubahan permission langsung berefek tanpa login ulang.
- Backend mengirim `permissions` (module→level) dan `page_permissions` di login & `/auth/me`.

## Build
- `npm run dev` — dev server (Vite)
- `npm run build` — `tsc -b && vite build`
- `npm run preview`
