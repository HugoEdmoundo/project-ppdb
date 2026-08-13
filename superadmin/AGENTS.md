# Superadmin - PTDARRAHMAN

Panel manajemen users & roles (Vite + React + TypeScript + Tailwind) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- Vite + React 18 + TypeScript
- Tailwind CSS, lucide-react
- Deploy: Cloudflare Pages (static)
- API: `src/api/client.ts` (fetch wrapper + JWT auto-refresh)

## Akses: KHUSUS superadmin
- Panel ini **hanya bisa diakses oleh `user_type === 'superadmin'`** (atau `is_superadmin` dari role).
- Tidak ada modul/permission `superadmin`. Jangan menambahkan tombol/menu/guard yang mengandalkan `permissions?.superadmin`.
- Enforce: `src/api/client.ts` (login menolak non-superadmin) + `src/components/ProtectedRoute.tsx`.
- Karena hanya superadmin yang masuk, semua CRUD di panel ini otomatis full-access.

## ATURAN: Tombol CRUD mengikuti permission
- Pola standar di tiap halaman:
  - `const canCrud = currentUser?.user_type === 'superadmin'`
  - `const canView = currentUser?.user_type === 'superadmin'`
- Semua tombol Buat/Edit/Hapus + kolom "Aksi" digate `{canCrud && ...}`.
- Halaman form (`/users/new`, `/users/:id`, `/roles/new`, `/roles/:id`) redirect ke list bila `!canCrud` (UserFormPage.tsx / RoleFormPage.tsx).
- `ProfilePage` = edit profil sendiri, tidak perlu guard CRUD.

## Module Permissions editor (RoleFormPage)
- Daftar modul yang bisa diberi permission per role: hanya **Company Profile** dan **PPDB**.
- Group PPDB menulis semua key sub-modul sekaligus: `ppdb`, `payment`, `selection`, `notification`, `dashboard`, `applicant_dashboard`.
- MODULE_LABELS di `src/types/index.ts` hanya berisi `companyprofile` & `ppdb`.

## Backend
- Backend = FastAPI monolitik di `../api/`; endpoints superadmin: `/users/*`, `/roles/*`, `/modules/*`, `/superadmin/*` (semua guard `require_superadmin`).
- API base default: `https://project-ppdb-murex.vercel.app`.

## Build
- `npm run dev` — dev server (Vite)
- `npm run build` — `tsc -b && vite build`
- `npm run preview`
