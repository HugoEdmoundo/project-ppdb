> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-06: API: Wave Configuration

## Info
| Item | Value |
|------|-------|
| Phase | Phase 2 |
| Priority | ðŸŸ¡ High |
| Estimasi | 1-2 hari |
| Dependencies | TASK-04, TASK-05 |

## Deskripsi
Menghubungkan Wave, Level, Category, dan Flow menjadi satu konfigurasi utuh yang menentukan alur seorang pendaftar.

## Scope
### Backend (API)
- CRUD wave_configurations
- Validasi kombinasi unik wave_id + level_id + category_id
