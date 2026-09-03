> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-05: API: Education Level, Category, Selection Flow

## Info
| Item | Value |
|------|-------|
| Phase | Phase 2 |
| Priority | ðŸ”´ Critical |
| Estimasi | 2-3 hari |
| Dependencies | TASK-01 |

## Deskripsi
Pembuatan API untuk mengelola Master Data Jenjang (Level), Kategori Pendaftaran, dan Alur Seleksi.

## Scope
### Backend (API)
- CRUD education_levels
- CRUD registration_categories
- CRUD selection_flows & selection_flow_steps
