## Objective
- Redesign daftar gelombang di `WavesSheet.tsx` (sheet "Gelombang — {periode}" di `/admin/periods`) dari tabel 8 kolom yang sempit menjadi **kartu gelombang** yang nyaman dibaca, plus **backend enrichment `filled`** (jumlah pendaftar real per gelombang). **Done & verified** — belum di-commit (user belum minta).

## Important Details
- Credentials superadmin / SuperAdmin123?.; API live `http://127.0.0.1:8000`, DB = `apps/api/dev.db` (SQLite). VENV = `apps/api/.venv\Scripts\python.exe`. **Catatan penting**: uvicorn --reload SEMPAT WEDGE setelah edit backend → harus restart manual via
  `Start-Process .venv\Scripts\python.exe -ArgumentList "-m","uvicorn","src.main:app","--reload","--port","8000"` (CWD apps/api). Global uv python tidak punya uvicorn.
- Wave sementara "Gelombang Test Verify" (id `wave-bc63b67f...`) dibuat untuk verifikasi `filled` lalu dihapus — DB bersih, periode "ppdb baru" aktif tanpa wave (user yang membuat gelombangnya sendiri).
- Design language ppdb: emerald (primary/bright/dark/light), gold (accent/bg), rose (danger/light); `glass-card`, `rounded-2xl`; EmptyState di @repo/ui mendukung `actionLabel`/`onAction`.
- Verifikasi: ruff 0, mypy 0, tsc 0, eslint 0 (hanya 1 warning pre-existing react-hook-form `watch()` di WavesSheet:174, bukan dari perubahan ini).

## Work State
### Completed
- **Backend** (`apps/api/src/services/ppdb_service.py::get_waves`): tiap wave kini menyertakan `filled = count_applicants_in_wave(w.id)` (termasuk soft-deleted/expired, konsisten aturan PPDB). `count_applicants_in_wave()` sudah ada di ppdb_repository.py:382. Verified live (list → `"filled":0`).
- **Frontend** (`apps/ppdb/src/pages/admin/ppdb/components/WavesSheet.tsx`):
  - Sheet dilebarin: `sm:max-w-2xl sm:w-[600px]` → `sm:max-w-3xl sm:w-[720px]`.
  - Tabel 8 kolom DIHAPUS → list **kartu gelombang** (space-y-4): header (chip `Gel.{n}` + nama + badge status + hint "Data ... mengacu pada gelombang ini" untuk aktif / "tidak aktif — belum menerima pendaftar"), aksi ringkas (Aktifkan/Nonaktifkan berlabel + $/Edit/Hapus icon), grid 3 metrik (Kuota `filled/quota` + progress bar → rose jika ≥90% + "X slot tersisa"; Biaya Formulir Rp/Gratis; Jalur & Jenjang badges), dan **timeline stepper 4 langkah** (Mulai Daftar → Akhir Daftar → Upload Dok → Seleksi) dengan tahap selesai (check emerald), tahap aktif (gold), tahap mendatang (abu). Wave aktif diberi ring emerald.
  - Empty state: pakai `actionLabel="Tambah Gelombang"` + `onAction=openCreate` → CTA langsung di area kosong.
  - Loading: 3 skeleton kartu (ganti TableSkeletonRows).
  - Helper baru: `fmtDateShort`, `localIso`, `todayIso`, `WAVE_MILESTONES`. Imports: +Fragment, +cn, +Check/Users/Banknote/Layers; hapus TableSkeletonRows & `colCount`.

### Active
- (none)

### Blocked
- (none)

## Next Move
1. (opsional) Commit & push jika user minta — 2 file: `apps/api/src/services/ppdb_service.py`, `apps/ppdb/src/pages/admin/ppdb/components/WavesSheet.tsx`. Saran pesan: `feat(ppdb): wave list cards + filled quota backend`.
2. (opsional) User membuat gelombang asli di UI `/admin/periods` untuk memastikan tampilan kartu benar.

## Relevant Files
- `apps/ppdb/src/pages/admin/ppdb/components/WavesSheet.tsx`: redesign kartu (CHANGED).
- `apps/api/src/services/ppdb_service.py:127`: `get_waves` + `filled` (CHANGED).
- `apps/api/src/repositories/ppdb_repository.py:382`: `count_applicants_in_wave` (sudah ada).
- `packages/ui/src/components/ui/emptystate.tsx:45`: `actionLabel`/`onAction` support.
- `apps/ppdb/tailwind.config.js`: token warna emerald/gold/rose.