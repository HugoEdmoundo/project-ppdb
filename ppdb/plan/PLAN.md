# Implementation Plan — Backend PPDB Rebuild (Periods & Waves)

Language: English (technical) · Business rules: see [`../PRD.md`](../PRD.md) · Schema: see [`../ERD.md`](../ERD.md)

> **Goal:** Remove all legacy PPDB backend code/tables and rebuild from scratch a minimal, correct **Period → Wave** config module in `backend/` (Hono / Bun / MySQL).

## Phase A — Delete legacy PPDB backend (start empty)

1. Delete all 7 files in `backend/src/ppdb/`:
   `routes.ts`, `payment.routes.ts`, `selection.routes.ts`, `post.routes.ts`, `notif.routes.ts`, `dashboard.routes.ts`, `middleware.ts`.
2. Delete migrations `backend/migrations/008_ppdb_config.sql` … `016_ppdb_modules_pages.sql` (9 files).
   - ⚠️ The `ppdb` module row in `modules`/`pages` is seeded by `backend/src/seed.ts` step 16 (not by migration 016), so the module stays for the permission system. Migration 016 only expanded the page list → safe to delete.
3. Delete seeds: `backend/seeds/ppdb/education_levels.sql`, `registration_categories.sql`, `test_types.sql`.
   - **KEEP** `backend/seeds/ppdb/roles.sql` (roles: Superadmin, Admin Seleksi, Admin Finance, Admin Penguji, **Calon Murid**, Editor, Viewer — used by `/auth/register-applicant`).
4. Drop all legacy PPDB tables via a temporary script `backend/src/drop_ppdb.ts` (run once, then delete it):
   - Wrap with `SET FOREIGN_KEY_CHECKS=0` / `=1`.
   - Tables: `ppdb_periods`, `ppdb_waves`, `education_levels`, `registration_categories`, `selection_flows`, `selection_flow_steps`, `wave_configurations`, `applicants`, `applicant_profiles`, `applicant_parents`, `applicant_status_histories`, `document_requirements`, `applicant_documents`, `test_types`, `test_parameters`, `test_sessions`, `applicant_test_sessions`, `applicant_test_results`, `applicant_test_scores`, `graduation_rules`, `applicant_graduations`, `payment_stages`, `invoices`, `payment_transactions`, `installment_plans`, `installment_schedules`, `discounts`, `applicant_discounts`, `mou_templates`, `applicant_mous`, `acceptance_letters`, `re_registrations`, `mpls_schedules`, `applicant_mpls`, `academic_calendars`, `notification_templates`, `notifications`, `dashboard_statistics`.
   - Do **NOT** touch: `site_settings`, `contact_info`, `roles`, `users`, `modules`, `pages`, `user_page_permissions`, `audit_log`, `file_uploads`, company-profile tables.
5. Update `backend/src/app.ts`:
   - Remove imports/mounts of `paymentRoutes`, `selectionRoutes`, `postRoutes`, `notifRoutes`, `dashboardRoutes`, and the legacy `ppdbRoutes`.
   - Mount the new `ppdbRoutes` on `/ppdb`.
6. Update `backend/src/db/mysql.ts`:
   - Remove `getWaveConfigIdsForPeriod` (references dropped table `wave_configurations`).
   - **Keep** `getActivePeriodId()` (`SELECT id FROM ppdb_periods WHERE status = "active" LIMIT 1`).
7. Update `backend/src/seed.ts`:
   - Remove the `ppdbMigrations` block (008–015) and the 016 expansion block.
   - Apply only the new migration file (Phase B.1).
   - Set `ppdbSeeds = ['roles.sql']`.
   - Update the verification table list: drop all legacy PPDB tables, keep real tables + the new `ppdb_periods`/`ppdb_waves`.
8. Update `backend/src/openapi.ts`:
   - Delete sections `/ppdb/*`, `/payment/*`, `/selection/*`, `/notif/*`, `/post/*`, `/dashboard/*` (approx. lines 982–1329) and tags `PPDB`, `Payment`, `Selection`, `Notifications`, `Post`, `Dashboard`.
   - Re-add the new Periods/Waves endpoints (Phase B.3).

## Phase B — Build new: Periods & Waves

### B.1 Migration `backend/migrations/008_ppdb_periods_waves.sql`
- Create `ppdb_periods` and `ppdb_waves` exactly as [`../ERD.md`](../ERD.md).
- status: `VARCHAR(20) DEFAULT 'inactive' COMMENT 'active,inactive'`.
- `ppdb_waves`: `UNIQUE(period_id, wave_number)`, FK `period_id` → `ppdb_periods(id) ON DELETE CASCADE`.

### B.2 Middleware `backend/src/ppdb/middleware.ts` (recreate)
```ts
export function requireModuleAccess(module: string, required: AccessLevel = 'read') { ... }
export const requirePPDBRead  = requireModuleAccess('ppdb', 'read')
export const requirePPDBAdmin = requireModuleAccess('ppdb', 'crud')
```
- Enforce at backend; superadmin bypass (`user_type === 'superadmin'`).

### B.3 Routes `backend/src/ppdb/routes.ts` — Periods & Waves only

All mutating endpoints behind `requirePPDBAdmin`; reads behind `requirePPDBRead`.

| Endpoint | Middleware | Behavior |
|---|---|---|
| `GET /ppdb/periods` | read | list + search/paginate, enrich with wave count |
| `GET /ppdb/periods/all` | read | plain list (for dropdowns) |
| `GET /ppdb/periods/:id` | read | detail + its waves |
| `POST /ppdb/periods` | crud | validate; **force `status='inactive'`** |
| `PUT /ppdb/periods/:id` | crud | update info only (**status not changeable**) |
| `PUT /ppdb/periods/:id/activate` | crud | **tx:** set all periods + all waves of other periods → `inactive`; set this period → `active`; auditLog |
| `PUT /ppdb/periods/:id/deactivate` | crud | **tx:** set this period → `inactive`; **all its waves → `inactive`**; auditLog |
| `DELETE /ppdb/periods/:id` | crud | delete (cascades waves via FK) |
| `GET /ppdb/waves?period_id=` | read | list waves (filtered by period) |
| `GET /ppdb/waves/all` | read | plain list |
| `GET /ppdb/waves/:id` | read | detail |
| `POST /ppdb/waves` | crud | validate; `wave_number = MAX(wave_number)+1` in period; **force `status='inactive'`**; period must exist |
| `PUT /ppdb/waves/:id` | crud | update info only (**status not changeable**) |
| `PUT /ppdb/waves/:id/activate` | crud | **if parent period NOT `active` → 400 "Periode belum aktif"**; **tx:** set all other waves → `inactive`; set this → `active`; auditLog |
| `PUT /ppdb/waves/:id/deactivate` | crud | set this wave → `inactive`; auditLog |
| `DELETE /ppdb/waves/:id` | crud | delete |

Notes:
- Creating a wave is **allowed even when the period is not active** (only activation is gated).
- All activate/deactivate operations run in a transaction + `auditLog`.
- `PUT` (regular update) must never touch `status`.

## Phase C — Verification

1. `bunx tsc --noEmit` (in `backend/`) — clean.
2. `bun run lint` (eslint) — clean.
3. Manual API tests (curl) with JWT from login:
   - create period (status forced `inactive`)
   - create wave while period inactive → **should succeed**
   - activate wave while period inactive → **should 400**
   - activate period → activate wave → **success**
   - activate a second period/wave → first becomes inactive (only 1 active global)
   - deactivate period → its waves become inactive
4. `bun run seed` → re-bootstrap fresh DB with new schema + roles.
5. Verify `GET /modules` still returns the `ppdb` module (permission system intact).

## Non-goals (this iteration)

Applicants, documents, selection, payments, MOU, re-registration, MPLS, notifications, dashboard stats. Frontend rebuild. Anything in `TA/`.
