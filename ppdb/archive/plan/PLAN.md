> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# ðŸ“‹ Implementation Plan â€” Sistem PPDB Terintegrasi

## Document Information

| Item | Value |
|------|-------|
| Source | [PRD.md](file:///C:/ptdarrahman.sch.id/ppdb/PRD.md) + [ERD.md](file:///C:/ptdarrahman.sch.id/ppdb/ERD.md) |
| Status | Draft |
| Created | July 2026 |
| Tech Stack | Frontend: React + TypeScript + Vite + TailwindCSS / Backend: Hono (existing) + Python FastAPI (existing) |

---

## 1. Ringkasan Proyek

Sistem PPDB Terintegrasi adalah platform digital end-to-end untuk mengelola penerimaan peserta didik baru di pesantren/sekolah. Sistem ini mencakup:
- Multi-periode & multi-gelombang pendaftaran
- Multi-jenjang pendidikan & kategori pendaftaran
- Flow seleksi dinamis (configurable)
- Pembayaran terintegrasi (payment gateway + manual)
- Manajemen dokumen, MOU, surat penerimaan
- Dashboard & reporting per role
- Notification center (WhatsApp + Email)
- Audit trail lengkap

### Current State
- Frontend: Boilerplate Vite + React (belum ada implementasi PPDB)
- Backend: Hono (TypeScript) + FastAPI (Python) â€” sudah ada auth, roles, users, students, SPP, company profile
- Database: PostgreSQL via Drizzle ORM (Hono) + SQLAlchemy (FastAPI)

---

## 2. Arsitektur Tingkat Tinggi

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    PPDB Frontend                        â”‚
â”‚              React + TypeScript + Vite                  â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Public   â”‚ â”‚ Applicantâ”‚ â”‚ Admin    â”‚ â”‚ Finance  â”‚  â”‚
â”‚  â”‚ Landing  â”‚ â”‚ Portal   â”‚ â”‚ Dashboardâ”‚ â”‚ Dashboardâ”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚ REST API
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                  Backend API (Hono)                      â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
â”‚  â”‚ Auth   â”‚ â”‚ PPDB   â”‚ â”‚Payment â”‚ â”‚Notif   â”‚          â”‚
â”‚  â”‚Module  â”‚ â”‚ Config â”‚ â”‚Module  â”‚ â”‚Module  â”‚          â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
â”‚  â”‚Applicantâ”‚ â”‚Doc     â”‚ â”‚Selectionâ”‚ â”‚Report  â”‚          â”‚
â”‚  â”‚Module  â”‚ â”‚Module  â”‚ â”‚Module  â”‚ â”‚Module  â”‚          â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚   PostgreSQL    â”‚
              â”‚   (37 tables)   â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 3. Phase Breakdown

### Phase 1 â€” Foundation & Core Setup
> Bangun pondasi: database schema, auth integration, routing, layout

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-01](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-01.md) | Database Schema & Migrations | 3-4 hari |
| [TASK-02](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-02.md) | Frontend Project Setup (Router, Layout, Auth) | 2-3 hari |
| [TASK-03](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-03.md) | Auth Integration (Login, Register, Token) | 2-3 hari |

### Phase 2 â€” PPDB Configuration Module (Admin)
> Superadmin bisa konfigurasi PPDB

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-04](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-04.md) | API: PPDB Period & Wave CRUD | 2-3 hari |
| [TASK-05](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-05.md) | API: Education Level, Category, Selection Flow | 2-3 hari |
| [TASK-06](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-06.md) | API: Wave Configuration (Level + Category + Flow mapping) | 1-2 hari |
| [TASK-07](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-07.md) | Frontend: PPDB Configuration Pages | 3-4 hari |

### Phase 3 â€” Applicant Registration & Profile
> Calon murid mendaftar, isi data, lihat status

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-08](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-08.md) | API: Applicant Registration & Profile | 2-3 hari |
| [TASK-09](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-09.md) | API: Applicant Parents & Status History | 1-2 hari |
| [TASK-10](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-10.md) | Frontend: Public Landing & Registration Form | 3-4 hari |
| [TASK-11](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-11.md) | Frontend: Applicant Dashboard & Profile | 2-3 hari |

### Phase 4 â€” Document Management
> Upload, review, approve/reject dokumen

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-12](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-12.md) | API: Document Requirements & Applicant Documents | 2-3 hari |
| [TASK-13](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-13.md) | Frontend: Document Upload & Review | 2-3 hari |

### Phase 5 â€” Payment Management
> Invoice, payment gateway, manual payment, cicilan, diskon

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-14](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-14.md) | API: Payment Stages, Invoices, Transactions | 3-4 hari |
| [TASK-15](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-15.md) | API: Installment Plans & Discounts | 2-3 hari |
| [TASK-16](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-16.md) | Frontend: Payment & Invoice Pages | 3-4 hari |

### Phase 6 â€” Selection & Testing
> Tes dinamis, penjadwalan, penilaian, kelulusan

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-17](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-17.md) | API: Test Types, Parameters, Sessions | 2-3 hari |
| [TASK-18](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-18.md) | API: Test Results, Scores, Graduation Rules | 2-3 hari |
| [TASK-19](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-19.md) | Frontend: Selection & Testing Pages | 3-4 hari |

### Phase 7 â€” MOU & Acceptance
> MOU, surat penerimaan, registrasi ulang, MPLS

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-20](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-20.md) | API: MOU, Acceptance Letters, Re-registration, MPLS | 2-3 hari |
| [TASK-21](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-21.md) | Frontend: MOU, Acceptance & Re-registration Pages | 3-4 hari |

### Phase 8 â€” Notifications & Calendar
> WhatsApp, Email, Reminder, Kalender Akademik

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-22](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-22.md) | API: Notification Center & Templates | 2-3 hari |
| [TASK-23](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-23.md) | API: Academic Calendar | 1 hari |
| [TASK-24](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-24.md) | Frontend: Notification & Calendar Pages | 2-3 hari |

### Phase 9 â€” Dashboard & Reporting
> Dashboard per role, export, audit trail

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-25](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-25.md) | API: Dashboard Statistics & Audit Logs | 2-3 hari |
| [TASK-26](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-26.md) | API: Reporting (PDF, Excel Export) | 2-3 hari |
| [TASK-27](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-27.md) | Frontend: Dashboard per Role | 3-4 hari |
| [TASK-28](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-28.md) | Frontend: Reporting & Export Pages | 2-3 hari |

### Phase 10 â€” Integration Testing & Polish
> End-to-end testing, bug fixing, optimasi

| Task | Deskripsi | Estimasi |
|------|-----------|----------|
| [TASK-29](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-29.md) | End-to-End Flow Testing | 3-4 hari |
| [TASK-30](file:///C:/ptdarrahman.sch.id/ppdb/plan/task/TASK-30.md) | Performance Optimization & Security Hardening | 2-3 hari |

---

## 4. Database Tables Mapping (ERD â†’ Modules)

| Module | Tables |
|--------|--------|
| Auth & Users | `users`, `roles`, `user_roles`, `refresh_tokens` |
| PPDB Config | `ppdb_periods`, `ppdb_waves`, `education_levels`, `registration_categories`, `selection_flows`, `selection_flow_steps`, `wave_configurations` |
| Applicant | `applicants`, `applicant_profiles`, `applicant_parents`, `applicant_status_histories` |
| Documents | `document_requirements`, `applicant_documents` |
| Selection | `test_types`, `test_parameters`, `test_sessions`, `applicant_test_sessions`, `applicant_test_results`, `applicant_test_scores`, `graduation_rules`, `applicant_graduations` |
| Payment | `payment_stages`, `invoices`, `payment_transactions`, `installment_plans`, `installment_schedules`, `discounts`, `applicant_discounts` |
| MOU | `mou_templates`, `applicant_mous` |
| Acceptance | `acceptance_letters`, `re_registrations` |
| MPLS | `mpls_schedules`, `applicant_mpls` |
| Calendar | `academic_calendars` |
| Notifications | `notifications`, `notification_templates` |
| Storage | `file_uploads` |
| Audit | `audit_logs` |
| Dashboard | `dashboard_statistics` |

**Total: 37 tables**

---

## 5. User Roles & Access Matrix

| Feature | Calon Murid | Orang Tua | Admin Seleksi | Penguji | Finance | Superadmin |
|---------|:-----------:|:---------:|:-------------:|:-------:|:-------:|:----------:|
| Registrasi | âœ… | â€” | â€” | â€” | â€” | â€” |
| Profile | âœ… | ðŸ‘ | ðŸ‘ | â€” | â€” | ðŸ‘ |
| Upload Dokumen | âœ… | â€” | â€” | â€” | â€” | â€” |
| Review Dokumen | â€” | â€” | âœ… | â€” | â€” | âœ… |
| Jadwal Tes | ðŸ‘ | ðŸ‘ | âœ… | ðŸ‘ | â€” | âœ… |
| Input Nilai | â€” | â€” | â€” | âœ… | â€” | âœ… |
| Kelulusan | ðŸ‘ | ðŸ‘ | âœ… | â€” | â€” | âœ… |
| Pembayaran | âœ… | âœ… | â€” | â€” | âœ… | âœ… |
| Invoice | ðŸ‘ | ðŸ‘ | â€” | â€” | âœ… | âœ… |
| MOU | âœ… | â€” | âœ… | â€” | â€” | âœ… |
| Dashboard | â€” | â€” | âœ… | âœ… | âœ… | âœ… |
| Config PPDB | â€” | â€” | â€” | â€” | â€” | âœ… |
| Audit Trail | â€” | â€” | â€” | â€” | â€” | âœ… |

> âœ… = Full Access, ðŸ‘ = Read Only, â€” = No Access

---

## 6. Dependency Graph

```mermaid
graph TD
    T01["TASK-01: DB Schema"] --> T04["TASK-04: Period & Wave API"]
    T01 --> T05["TASK-05: Level, Category, Flow API"]
    T01 --> T08["TASK-08: Applicant API"]
    
    T02["TASK-02: Frontend Setup"] --> T07["TASK-07: Config Pages"]
    T02 --> T10["TASK-10: Landing & Registration"]
    T02 --> T11["TASK-11: Applicant Dashboard"]
    
    T03["TASK-03: Auth"] --> T08
    T03 --> T07
    
    T04 --> T06["TASK-06: Wave Config API"]
    T05 --> T06
    T06 --> T07
    
    T08 --> T09["TASK-09: Parents & Status"]
    T08 --> T12["TASK-12: Document API"]
    T08 --> T14["TASK-14: Payment API"]
    T08 --> T17["TASK-17: Test API"]
    
    T12 --> T13["TASK-13: Document UI"]
    T14 --> T15["TASK-15: Installment API"]
    T14 --> T16["TASK-16: Payment UI"]
    T17 --> T18["TASK-18: Graduation API"]
    T17 --> T19["TASK-19: Selection UI"]
    
    T18 --> T20["TASK-20: MOU & Acceptance API"]
    T20 --> T21["TASK-21: MOU UI"]
    
    T01 --> T22["TASK-22: Notification API"]
    T01 --> T23["TASK-23: Calendar API"]
    T22 --> T24["TASK-24: Notification UI"]
    T23 --> T24
    
    T01 --> T25["TASK-25: Dashboard API"]
    T25 --> T26["TASK-26: Report API"]
    T25 --> T27["TASK-27: Dashboard UI"]
    T26 --> T28["TASK-28: Report UI"]
    
    T27 --> T29["TASK-29: E2E Testing"]
    T28 --> T29
    T29 --> T30["TASK-30: Optimization"]
```

---

## 7. Estimasi Total

| Phase | Estimasi |
|-------|----------|
| Phase 1 â€” Foundation | 7-10 hari |
| Phase 2 â€” PPDB Config | 8-12 hari |
| Phase 3 â€” Applicant | 8-12 hari |
| Phase 4 â€” Documents | 4-6 hari |
| Phase 5 â€” Payment | 8-11 hari |
| Phase 6 â€” Selection | 7-10 hari |
| Phase 7 â€” MOU & Acceptance | 5-7 hari |
| Phase 8 â€” Notifications | 5-7 hari |
| Phase 9 â€” Dashboard & Reports | 9-13 hari |
| Phase 10 â€” Testing & Polish | 5-7 hari |
| **TOTAL** | **~66-95 hari kerja** |

> âš ï¸ Estimasi berdasarkan 1 developer full-time. Dengan tim, timeline bisa dipercepat signifikan karena banyak task bisa dikerjakan paralel.

---

## 8. Task List Summary

| ID | Task | Phase | Dependencies | Priority |
|----|------|-------|--------------|----------|
| TASK-01 | Database Schema & Migrations | 1 | â€” | ðŸ”´ Critical |
| TASK-02 | Frontend Project Setup | 1 | â€” | ðŸ”´ Critical |
| TASK-03 | Auth Integration | 1 | TASK-01 | ðŸ”´ Critical |
| TASK-04 | API: Period & Wave CRUD | 2 | TASK-01 | ðŸ”´ Critical |
| TASK-05 | API: Level, Category, Flow | 2 | TASK-01 | ðŸ”´ Critical |
| TASK-06 | API: Wave Configuration | 2 | TASK-04, TASK-05 | ðŸŸ¡ High |
| TASK-07 | Frontend: Config Pages | 2 | TASK-02, TASK-06 | ðŸŸ¡ High |
| TASK-08 | API: Applicant Registration | 3 | TASK-01, TASK-03 | ðŸ”´ Critical |
| TASK-09 | API: Parents & Status | 3 | TASK-08 | ðŸŸ¡ High |
| TASK-10 | Frontend: Landing & Registration | 3 | TASK-02, TASK-08 | ðŸ”´ Critical |
| TASK-11 | Frontend: Applicant Dashboard | 3 | TASK-02, TASK-08 | ðŸŸ¡ High |
| TASK-12 | API: Document Management | 4 | TASK-08 | ðŸŸ¡ High |
| TASK-13 | Frontend: Document Upload & Review | 4 | TASK-12 | ðŸŸ¡ High |
| TASK-14 | API: Payment Stages & Invoice | 5 | TASK-08 | ðŸ”´ Critical |
| TASK-15 | API: Installment & Discounts | 5 | TASK-14 | ðŸŸ¡ High |
| TASK-16 | Frontend: Payment Pages | 5 | TASK-14 | ðŸŸ¡ High |
| TASK-17 | API: Test Types & Sessions | 6 | TASK-08 | ðŸŸ¡ High |
| TASK-18 | API: Results & Graduation | 6 | TASK-17 | ðŸŸ¡ High |
| TASK-19 | Frontend: Selection Pages | 6 | TASK-17 | ðŸŸ¡ High |
| TASK-20 | API: MOU & Acceptance | 7 | TASK-18 | ðŸŸ¢ Medium |
| TASK-21 | Frontend: MOU & Acceptance | 7 | TASK-20 | ðŸŸ¢ Medium |
| TASK-22 | API: Notifications | 8 | TASK-01 | ðŸŸ¢ Medium |
| TASK-23 | API: Academic Calendar | 8 | TASK-01 | ðŸŸ¢ Medium |
| TASK-24 | Frontend: Notif & Calendar | 8 | TASK-22, TASK-23 | ðŸŸ¢ Medium |
| TASK-25 | API: Dashboard & Audit | 9 | TASK-01 | ðŸŸ¡ High |
| TASK-26 | API: Reporting | 9 | TASK-25 | ðŸŸ¢ Medium |
| TASK-27 | Frontend: Dashboard | 9 | TASK-25 | ðŸŸ¡ High |
| TASK-28 | Frontend: Reporting | 9 | TASK-26 | ðŸŸ¢ Medium |
| TASK-29 | E2E Testing | 10 | All | ðŸ”´ Critical |
| TASK-30 | Optimization & Security | 10 | TASK-29 | ðŸŸ¡ High |

