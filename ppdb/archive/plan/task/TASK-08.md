> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-08: API: Applicant Registration & Profile

## Info
| Item | Value |
|------|-------|
| Phase | Phase 3 |
| Priority | ðŸ”´ Critical |
| Estimasi | 2-3 hari |
| Dependencies | TASK-01, TASK-03 |

## Deskripsi
Pembuatan API untuk proses pendaftaran dan pengelolaan profil pendaftar.

## Scope
### Backend (API)
- POST /applicants/register
- GET /applicants/:id & PUT /applicants/:id/profile
- GET /applicants

### Database
- applicants, applicant_profiles, users

