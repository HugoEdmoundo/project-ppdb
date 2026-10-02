> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# TASK-01: Database Schema & Migrations

## Info
| Item | Value |
|------|-------|
| Phase | Phase 1 â€” Foundation |
| Priority | ðŸ”´ Critical |
| Estimasi | 3-4 hari |
| Dependencies | â€” |

## Deskripsi
Membuat seluruh schema database menggunakan Drizzle ORM untuk PostgreSQL. Task ini mencakup definisi 37 tabel sesuai ERD, pembuatan migration files, dan seeding data awal untuk tabel referensi. Schema harus mencakup relasi antar tabel, index, constraint, dan enum types yang diperlukan.

## Scope

### Backend (API)
- Definisi Drizzle ORM schema untuk seluruh 37 tabel
- Generate migration files via `drizzle-kit generate`
- Jalankan migration via `drizzle-kit migrate`
- Seed script untuk data awal (`src/db/seed.ts`)

### Database â€” Daftar Lengkap 37 Tabel

#### 1. Auth Module (4 tabel)

**users**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK, default gen_random_uuid() |
| username | varchar(100) | UNIQUE, NOT NULL |
| email | varchar(255) | UNIQUE, NOT NULL |
| password_hash | varchar(255) | NOT NULL |
| is_active | boolean | DEFAULT true |
| last_login_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**roles**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(100) | NOT NULL |
| description | text | nullable |
| created_at | timestamp | DEFAULT now() |

**user_roles**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK â†’ users.id, NOT NULL |
| role_id | uuid | FK â†’ roles.id, NOT NULL |
| created_at | timestamp | DEFAULT now() |
| | | UNIQUE(user_id, role_id) |

**refresh_tokens**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK â†’ users.id, NOT NULL |
| token | varchar(500) | UNIQUE, NOT NULL |
| expires_at | timestamp | NOT NULL |
| is_revoked | boolean | DEFAULT false |
| created_at | timestamp | DEFAULT now() |

#### 2. Config Module (7 tabel)

**ppdb_periods**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| name | varchar(200) | NOT NULL |
| academic_year | varchar(20) | NOT NULL (e.g. "2026/2027") |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL |
| status | ppdb_period_status_enum | DEFAULT 'draft' |
| description | text | nullable |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **ppdb_period_status_enum**: `draft`, `active`, `closed`, `archived`

**ppdb_waves**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| period_id | uuid | FK â†’ ppdb_periods.id, NOT NULL |
| name | varchar(200) | NOT NULL |
| wave_number | integer | NOT NULL |
| start_date | date | NOT NULL |
| end_date | date | NOT NULL |
| quota | integer | NOT NULL |
| waiting_list_enabled | boolean | DEFAULT false |
| auto_move_next_wave | boolean | DEFAULT false |
| default_discount_type | discount_type_enum | nullable |
| default_discount_value | decimal(15,2) | nullable |
| status | wave_status_enum | DEFAULT 'draft' |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(period_id, wave_number) |

> **wave_status_enum**: `draft`, `open`, `closed`
> **discount_type_enum**: `percentage`, `fixed`

**education_levels**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(20) | UNIQUE, NOT NULL |
| name | varchar(100) | NOT NULL |
| description | text | nullable |
| sort_order | integer | DEFAULT 0 |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**registration_categories**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(100) | NOT NULL |
| description | text | nullable |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**selection_flows**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| name | varchar(200) | NOT NULL |
| description | text | nullable |
| is_active | boolean | DEFAULT true |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**selection_flow_steps**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| flow_id | uuid | FK â†’ selection_flows.id, NOT NULL, ON DELETE CASCADE |
| sequence | integer | NOT NULL |
| code | varchar(50) | NOT NULL |
| name | varchar(200) | NOT NULL |
| step_type | step_type_enum | NOT NULL |
| is_required | boolean | DEFAULT true |
| config | jsonb | nullable (konfigurasi tambahan per step) |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(flow_id, sequence) |
| | | UNIQUE(flow_id, code) |

> **step_type_enum**: `payment`, `document`, `test`, `mou`, `announcement`

**wave_configurations**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| wave_id | uuid | FK â†’ ppdb_waves.id, NOT NULL |
| level_id | uuid | FK â†’ education_levels.id, NOT NULL |
| category_id | uuid | FK â†’ registration_categories.id, NOT NULL |
| flow_id | uuid | FK â†’ selection_flows.id, NOT NULL |
| payment_stage_count | integer | DEFAULT 1 |
| quota | integer | NOT NULL |
| status | varchar(20) | DEFAULT 'active' |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(wave_id, level_id, category_id) |

#### 3. Applicant Module (4 tabel)

**applicants**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK â†’ users.id, UNIQUE, NOT NULL |
| registration_number | varchar(30) | UNIQUE, NOT NULL |
| wave_config_id | uuid | FK â†’ wave_configurations.id, NOT NULL |
| current_status | applicant_status_enum | DEFAULT 'registered' |
| registered_at | timestamp | DEFAULT now() |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **applicant_status_enum**: `registered`, `payment_pending`, `document_pending`, `testing`, `graduated`, `accepted`, `rejected`, `waiting_list`

**applicant_profiles**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, UNIQUE, NOT NULL |
| full_name | varchar(255) | NOT NULL |
| nickname | varchar(100) | nullable |
| gender | gender_enum | NOT NULL |
| birth_place | varchar(100) | NOT NULL |
| birth_date | date | NOT NULL |
| religion | varchar(50) | DEFAULT 'Islam' |
| nationality | varchar(50) | DEFAULT 'Indonesia' |
| nik | varchar(16) | nullable |
| nisn | varchar(20) | nullable |
| phone | varchar(20) | nullable |
| email | varchar(255) | nullable |
| address | text | NOT NULL |
| province | varchar(100) | nullable |
| city | varchar(100) | nullable |
| district | varchar(100) | nullable |
| village | varchar(100) | nullable |
| postal_code | varchar(10) | nullable |
| previous_school | varchar(255) | nullable |
| photo_url | varchar(500) | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **gender_enum**: `male`, `female`

**applicant_parents**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| parent_type | parent_type_enum | NOT NULL |
| full_name | varchar(255) | NOT NULL |
| nik | varchar(16) | nullable |
| phone | varchar(20) | nullable |
| email | varchar(255) | nullable |
| occupation | varchar(100) | nullable |
| income | varchar(50) | nullable |
| education | varchar(50) | nullable |
| address | text | nullable |
| is_same_address | boolean | DEFAULT false |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, parent_type) |

> **parent_type_enum**: `father`, `mother`, `guardian`

**applicant_status_histories**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| old_status | applicant_status_enum | nullable |
| new_status | applicant_status_enum | NOT NULL |
| changed_by | uuid | FK â†’ users.id, NOT NULL |
| notes | text | nullable |
| created_at | timestamp | DEFAULT now() |

#### 4. Documents Module (2 tabel)

**document_requirements**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| level_id | uuid | FK â†’ education_levels.id, nullable |
| category_id | uuid | FK â†’ registration_categories.id, nullable |
| name | varchar(200) | NOT NULL |
| description | text | nullable |
| file_type | varchar(50) | DEFAULT 'pdf' (pdf, jpg, png) |
| max_size_mb | integer | DEFAULT 5 |
| is_required | boolean | DEFAULT true |
| sort_order | integer | DEFAULT 0 |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**applicant_documents**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| requirement_id | uuid | FK â†’ document_requirements.id, NOT NULL |
| file_upload_id | uuid | FK â†’ file_uploads.id, nullable |
| file_url | varchar(500) | nullable |
| status | document_status_enum | DEFAULT 'pending' |
| verified_by | uuid | FK â†’ users.id, nullable |
| verified_at | timestamp | nullable |
| rejection_reason | text | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, requirement_id) |

> **document_status_enum**: `pending`, `uploaded`, `verified`, `rejected`

#### 5. Selection Module (7 tabel)

**test_types**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(200) | NOT NULL |
| description | text | nullable |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**test_parameters**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| test_type_id | uuid | FK â†’ test_types.id, NOT NULL |
| name | varchar(200) | NOT NULL |
| weight | decimal(5,2) | DEFAULT 1.0 |
| min_score | decimal(5,2) | DEFAULT 0 |
| max_score | decimal(5,2) | DEFAULT 100 |
| passing_score | decimal(5,2) | nullable |
| sort_order | integer | DEFAULT 0 |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**test_sessions**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| wave_config_id | uuid | FK â†’ wave_configurations.id, NOT NULL |
| test_type_id | uuid | FK â†’ test_types.id, NOT NULL |
| session_name | varchar(200) | NOT NULL |
| test_date | date | NOT NULL |
| start_time | time | NOT NULL |
| end_time | time | NOT NULL |
| location | varchar(255) | nullable |
| capacity | integer | NOT NULL |
| status | session_status_enum | DEFAULT 'scheduled' |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **session_status_enum**: `scheduled`, `ongoing`, `completed`, `cancelled`

**applicant_test_sessions**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| test_session_id | uuid | FK â†’ test_sessions.id, NOT NULL |
| attendance_status | attendance_enum | DEFAULT 'registered' |
| attended_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, test_session_id) |

> **attendance_enum**: `registered`, `present`, `absent`

**applicant_test_results**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| test_type_id | uuid | FK â†’ test_types.id, NOT NULL |
| total_score | decimal(8,2) | nullable |
| is_passed | boolean | nullable |
| notes | text | nullable |
| graded_by | uuid | FK â†’ users.id |
| graded_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, test_type_id) |

**applicant_test_scores**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| result_id | uuid | FK â†’ applicant_test_results.id, NOT NULL |
| parameter_id | uuid | FK â†’ test_parameters.id, NOT NULL |
| score | decimal(8,2) | NOT NULL |
| notes | text | nullable |
| created_at | timestamp | DEFAULT now() |
| | | UNIQUE(result_id, parameter_id) |

**graduation_rules**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| wave_config_id | uuid | FK â†’ wave_configurations.id, NOT NULL |
| rule_type | graduation_rule_type_enum | NOT NULL |
| min_total_score | decimal(8,2) | nullable |
| must_pass_all_tests | boolean | DEFAULT false |
| description | text | nullable |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **graduation_rule_type_enum**: `score_based`, `ranking_based`, `manual`

**applicant_graduations**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, UNIQUE, NOT NULL |
| is_graduated | boolean | NOT NULL |
| graduation_rank | integer | nullable |
| total_score | decimal(8,2) | nullable |
| decided_by | uuid | FK â†’ users.id |
| decided_at | timestamp | DEFAULT now() |
| notes | text | nullable |
| created_at | timestamp | DEFAULT now() |

#### 6. Payment Module (6 tabel)

**payment_stages**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| wave_config_id | uuid | FK â†’ wave_configurations.id, NOT NULL |
| stage_number | integer | NOT NULL |
| name | varchar(200) | NOT NULL |
| amount | decimal(15,2) | NOT NULL |
| due_date | date | nullable |
| description | text | nullable |
| is_installment_allowed | boolean | DEFAULT false |
| max_installments | integer | DEFAULT 1 |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(wave_config_id, stage_number) |

**invoices**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| payment_stage_id | uuid | FK â†’ payment_stages.id, NOT NULL |
| invoice_number | varchar(50) | UNIQUE, NOT NULL |
| amount | decimal(15,2) | NOT NULL |
| discount_amount | decimal(15,2) | DEFAULT 0 |
| total_amount | decimal(15,2) | NOT NULL |
| status | invoice_status_enum | DEFAULT 'unpaid' |
| due_date | date | nullable |
| paid_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **invoice_status_enum**: `unpaid`, `partial`, `paid`, `cancelled`, `overdue`

**payment_transactions**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| invoice_id | uuid | FK â†’ invoices.id, NOT NULL |
| transaction_number | varchar(50) | UNIQUE, NOT NULL |
| amount | decimal(15,2) | NOT NULL |
| payment_method | varchar(50) | NOT NULL |
| payment_proof_url | varchar(500) | nullable |
| status | transaction_status_enum | DEFAULT 'pending' |
| verified_by | uuid | FK â†’ users.id, nullable |
| verified_at | timestamp | nullable |
| notes | text | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **transaction_status_enum**: `pending`, `verified`, `rejected`, `refunded`

**installment_plans**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| invoice_id | uuid | FK â†’ invoices.id, UNIQUE, NOT NULL |
| total_installments | integer | NOT NULL |
| approved_by | uuid | FK â†’ users.id, nullable |
| approved_at | timestamp | nullable |
| status | varchar(20) | DEFAULT 'active' |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**installment_schedules**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| plan_id | uuid | FK â†’ installment_plans.id, NOT NULL |
| installment_number | integer | NOT NULL |
| amount | decimal(15,2) | NOT NULL |
| due_date | date | NOT NULL |
| status | installment_status_enum | DEFAULT 'unpaid' |
| paid_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |
| | | UNIQUE(plan_id, installment_number) |

> **installment_status_enum**: `unpaid`, `paid`, `overdue`

**discounts**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(200) | NOT NULL |
| discount_type | discount_type_enum | NOT NULL |
| value | decimal(15,2) | NOT NULL |
| max_usage | integer | nullable |
| current_usage | integer | DEFAULT 0 |
| valid_from | date | nullable |
| valid_until | date | nullable |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**applicant_discounts**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| discount_id | uuid | FK â†’ discounts.id, NOT NULL |
| invoice_id | uuid | FK â†’ invoices.id, nullable |
| applied_amount | decimal(15,2) | NOT NULL |
| applied_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, discount_id) |

#### 7. MOU Module (2 tabel)

**mou_templates**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| level_id | uuid | FK â†’ education_levels.id, nullable |
| name | varchar(200) | NOT NULL |
| content | text | NOT NULL |
| version | varchar(20) | DEFAULT '1.0' |
| is_active | boolean | DEFAULT true |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**applicant_mous**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| template_id | uuid | FK â†’ mou_templates.id, NOT NULL |
| signed_at | timestamp | nullable |
| signature_url | varchar(500) | nullable |
| status | mou_status_enum | DEFAULT 'pending' |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **mou_status_enum**: `pending`, `signed`, `rejected`

#### 8. Acceptance Module (2 tabel)

**acceptance_letters**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, UNIQUE, NOT NULL |
| letter_number | varchar(50) | UNIQUE, NOT NULL |
| issued_date | date | NOT NULL |
| content | text | nullable |
| pdf_url | varchar(500) | nullable |
| issued_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |

**re_registrations**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, UNIQUE, NOT NULL |
| deadline | date | NOT NULL |
| completed_at | timestamp | nullable |
| status | re_registration_status_enum | DEFAULT 'pending' |
| verified_by | uuid | FK â†’ users.id, nullable |
| notes | text | nullable |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **re_registration_status_enum**: `pending`, `completed`, `expired`

#### 9. MPLS Module (2 tabel)

**mpls_schedules**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| period_id | uuid | FK â†’ ppdb_periods.id, NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | nullable |
| event_date | date | NOT NULL |
| start_time | time | NOT NULL |
| end_time | time | NOT NULL |
| location | varchar(255) | nullable |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

**applicant_mpls**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| applicant_id | uuid | FK â†’ applicants.id, NOT NULL |
| schedule_id | uuid | FK â†’ mpls_schedules.id, NOT NULL |
| attendance_status | attendance_enum | DEFAULT 'registered' |
| attended_at | timestamp | nullable |
| created_at | timestamp | DEFAULT now() |
| | | UNIQUE(applicant_id, schedule_id) |

#### 10. Calendar Module (1 tabel)

**academic_calendars**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| period_id | uuid | FK â†’ ppdb_periods.id, NOT NULL |
| title | varchar(255) | NOT NULL |
| description | text | nullable |
| event_date | date | NOT NULL |
| event_type | varchar(50) | NOT NULL |
| is_public | boolean | DEFAULT true |
| created_by | uuid | FK â†’ users.id |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

#### 11. Notification Module (2 tabel)

**notification_templates**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| code | varchar(50) | UNIQUE, NOT NULL |
| name | varchar(200) | NOT NULL |
| subject | varchar(255) | NOT NULL |
| body_template | text | NOT NULL |
| channel | notification_channel_enum | DEFAULT 'in_app' |
| is_active | boolean | DEFAULT true |
| created_at | timestamp | DEFAULT now() |
| updated_at | timestamp | DEFAULT now() |

> **notification_channel_enum**: `in_app`, `email`, `whatsapp`, `sms`

**notifications**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK â†’ users.id, NOT NULL |
| template_id | uuid | FK â†’ notification_templates.id, nullable |
| title | varchar(255) | NOT NULL |
| message | text | NOT NULL |
| channel | notification_channel_enum | DEFAULT 'in_app' |
| is_read | boolean | DEFAULT false |
| read_at | timestamp | nullable |
| data | jsonb | nullable (metadata tambahan) |
| created_at | timestamp | DEFAULT now() |

#### 12. Storage Module (1 tabel)

**file_uploads**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| uploaded_by | uuid | FK â†’ users.id, NOT NULL |
| original_name | varchar(255) | NOT NULL |
| stored_name | varchar(255) | NOT NULL |
| mime_type | varchar(100) | NOT NULL |
| size_bytes | bigint | NOT NULL |
| storage_path | varchar(500) | NOT NULL |
| public_url | varchar(500) | nullable |
| entity_type | varchar(50) | nullable (e.g. 'applicant_document', 'payment_proof') |
| entity_id | uuid | nullable |
| created_at | timestamp | DEFAULT now() |

#### 13. Audit Module (1 tabel)

**audit_logs**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| user_id | uuid | FK â†’ users.id, nullable |
| action | varchar(50) | NOT NULL (CREATE, UPDATE, DELETE, LOGIN, etc.) |
| entity_type | varchar(100) | NOT NULL |
| entity_id | uuid | nullable |
| old_data | jsonb | nullable |
| new_data | jsonb | nullable |
| ip_address | varchar(45) | nullable |
| user_agent | text | nullable |
| created_at | timestamp | DEFAULT now() |

#### 14. Dashboard Module (1 tabel)

**dashboard_statistics**
| Column | Type | Constraint |
|--------|------|------------|
| id | uuid | PK |
| period_id | uuid | FK â†’ ppdb_periods.id, NOT NULL |
| stat_type | varchar(50) | NOT NULL |
| stat_key | varchar(100) | NOT NULL |
| stat_value | decimal(15,2) | NOT NULL |
| metadata | jsonb | nullable |
| calculated_at | timestamp | DEFAULT now() |
| | | UNIQUE(period_id, stat_type, stat_key) |

### Seed Data

#### Roles
```typescript
const roles = [
  { code: 'superadmin', name: 'Super Administrator' },
  { code: 'admin_ppdb', name: 'Admin PPDB' },
  { code: 'admin_keuangan', name: 'Admin Keuangan' },
  { code: 'penguji', name: 'Penguji / Tim Seleksi' },
  { code: 'applicant', name: 'Calon Peserta Didik' },
  { code: 'viewer', name: 'Viewer / Read-only' },
];
```

#### Education Levels
```typescript
const educationLevels = [
  { code: 'TK', name: 'Taman Kanak-Kanak', sort_order: 1 },
  { code: 'SD', name: 'Sekolah Dasar / MI', sort_order: 2 },
  { code: 'SMP', name: 'Sekolah Menengah Pertama / MTs', sort_order: 3 },
  { code: 'SMA', name: 'Sekolah Menengah Atas / MA', sort_order: 4 },
  { code: 'PESANTREN', name: 'Program Pesantren', sort_order: 5 },
];
```

#### Registration Categories
```typescript
const registrationCategories = [
  { code: 'REGULER', name: 'Jalur Reguler' },
  { code: 'PRESTASI', name: 'Jalur Prestasi' },
  { code: 'TAHFIDZ', name: 'Jalur Tahfidz' },
  { code: 'BEASISWA', name: 'Jalur Beasiswa' },
  { code: 'PINDAHAN', name: 'Jalur Pindahan' },
];
```

#### Test Types
```typescript
const testTypes = [
  { code: 'BTQ', name: 'Baca Tulis Al-Quran' },
  { code: 'WAWANCARA', name: 'Wawancara' },
  { code: 'AKADEMIK', name: 'Tes Akademik' },
  { code: 'PSIKOTES', name: 'Psikotes' },
  { code: 'TAHFIDZ', name: 'Tes Hafalan Al-Quran' },
  { code: 'KESEHATAN', name: 'Tes Kesehatan' },
];
```

## Acceptance Criteria
- [ ] Seluruh 37 tabel terdefinisi sebagai Drizzle schema di `src/db/schema/`
- [ ] Schema diorganisasi per module: `auth.ts`, `config.ts`, `applicant.ts`, `document.ts`, `selection.ts`, `payment.ts`, `mou.ts`, `acceptance.ts`, `mpls.ts`, `calendar.ts`, `notification.ts`, `storage.ts`, `audit.ts`, `dashboard.ts`
- [ ] Barrel export via `src/db/schema/index.ts`
- [ ] Seluruh enum types terdefinisi menggunakan `pgEnum`
- [ ] Semua foreign key relations terdefinisi dengan `references()`
- [ ] Migration berhasil dijalankan tanpa error (`drizzle-kit generate` & `drizzle-kit migrate`)
- [ ] Seed script berjalan dan data awal ter-insert
- [ ] Index terdefinisi pada kolom yang sering di-query (foreign keys, status, created_at)
- [ ] Unique constraints sesuai ERD
- [ ] Semua tabel memiliki `created_at` dan `updated_at` (kecuali tabel log/history yang hanya `created_at`)

## Technical Notes
- Gunakan `pgTable` dari `drizzle-orm/pg-core`
- UUID sebagai primary key menggunakan `uuid('id').primaryKey().defaultRandom()`
- Timestamp menggunakan `timestamp('created_at').defaultNow()`
- Enum menggunakan `pgEnum` â€” definisikan di awal file atau di file terpisah `enums.ts`
- Relasi didefinisikan menggunakan `relations()` dari `drizzle-orm` untuk query builder
- File schema di-split per modul agar maintainable
- Pastikan `drizzle.config.ts` sudah pointing ke folder schema yang benar
- Seed script menggunakan `drizzle-orm` insert, bukan raw SQL
- Jalankan `drizzle-kit push` untuk development, `drizzle-kit migrate` untuk production
