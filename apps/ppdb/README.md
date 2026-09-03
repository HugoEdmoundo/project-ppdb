# PPDB — Penerimaan Peserta Didik Baru

Dokumentasi resmi modul PPDB untuk **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**.

> ⚠️ **Status: REBUILD DARI NOL**
> Backend PPDB lama dihapus seluruhnya dan dibangun ulang. Model baru berbasis **Periode → Gelombang** dengan aturan aktivasi ketat.
> Dokumentasi versi lama ada di `archive/` (banner OBSOLETE). **Semua AI/manusia wajib membaca dokumen baru ini.**

## Peta dokumen

| Dokumen | Isi | Bahasa |
|---|---|---|
| [`README.md`](./README.md) | Pintu masuk, status project, peta dokumen (file ini) | Indonesia |
| [`PRD.md`](./PRD.md) | Kebutuhan bisnis & aturan (model Periode → Gelombang) | Indonesia |
| [`FLOW.md`](./FLOW.md) | Alur sistem: admin config, aktivasi, visibilitas data | Indonesia |
| [`ERD.md`](./ERD.md) | Skema database teknis (`ppdb_periods`, `ppdb_waves`) | English |
| [`plan/PLAN.md`](./plan/PLAN.md) | Rencana implementasi backend (delete lama → build baru → verifikasi) | English |

## Status saat ini

| Komponen | Status |
|---|---|
| Model bisnis & aturan | ✅ Dikunci (lihat PRD) |
| Skema DB baru | ✅ Dirancang (lihat ERD) |
| Backend (Hono/Bun/MySQL) | 🔜 Belum dibangun — lihat `plan/PLAN.md` |
| Frontend (Vite/React) | ⏸ Belum dibangun (fokus backend config dulu) |
| Jenjang, kategori, pendaftar, payment, seleksi, dll. | ⏳ Menyusul (tidak dibahas di scope ini) |

## Cara baca untuk AI baru

1. Baca `PRD.md` dulu — pahami **model bisnis** (Periode → Gelombang) dan **6 aturan aktivasi**.
2. Baca `FLOW.md` — pahami alur & matriks visibilitas.
3. Baca `ERD.md` — pahami skema DB target.
4. Baca `plan/PLAN.md` — pahami langkah implementasi yang harus dieksekusi di `backend/`.

Jangan membaca dokumen di `archive/` untuk kebutuhan teknis — semuanya sudah basi.

## Konteks monorepo

- `companyprofile/` — website publik + admin CRUD company profile (Next.js)
- `ppdb/` — aplikasi PPDB (Vite + React) **+ dokumentasi ini**
- `superadmin/` — panel manajemen users & roles (Vite + React)
- `backend/` — API utama Hono (Bun/TypeScript) + MySQL
- `api/` — FastAPI legacy/PoC, **jangan dipakai untuk fitur baru**
- `TA/` — project terpisah, **tidak terkait** dengan monorepo ini
