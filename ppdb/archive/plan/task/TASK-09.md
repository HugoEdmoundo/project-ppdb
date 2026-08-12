> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-09: API: Applicant Parents & Status History

## Info
| Item | Value |
|------|-------|
| Phase | Phase 3 |
| Priority | ðŸŸ¡ High |
| Estimasi | 1-2 hari |
| Dependencies | TASK-08 |

## Deskripsi
Pembuatan API untuk menyimpan data orang tua/wali serta pencatatan riwayat status (audit trail) pendaftar.

## Scope
### Backend (API)
- CRUD applicant_parents
- GET/POST applicant_status_histories

