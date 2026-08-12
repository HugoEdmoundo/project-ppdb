> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-04: API: PPDB Period & Wave CRUD

## Info
| Item | Value |
|------|-------|
| Phase | Phase 2 |
| Priority | ðŸ”´ Critical |
| Estimasi | 2-3 hari |
| Dependencies | TASK-01 |

## Deskripsi
Pembuatan API untuk mengelola Master Data Periode PPDB dan Gelombang (Wave).

## Scope
### Backend (API)
- CRUD ppdb_periods: GET list, GET by id, POST, PUT, DELETE
- CRUD ppdb_waves: GET list (by period), GET by id, POST, PUT, DELETE

### Database
- ppdb_periods, ppdb_waves

