> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-03: Auth Integration (Login, Register, Token)

## Info
| Item | Value |
|------|-------|
| Phase | Phase 1 |
| Priority | ðŸ”´ Critical |
| Estimasi | 2-3 hari |
| Dependencies | TASK-01 |

## Deskripsi
Implementasi fitur autentikasi khusus untuk sistem PPDB.

## Scope
### Backend (API)
- POST /auth/applicant/register
- POST /auth/applicant/login
- Token refresh mechanism

### Frontend (UI)
- Login page & register page khusus applicant
- Auth store dengan Zustand
- Protected route component

### Database
- users, refresh_tokens, applicants

