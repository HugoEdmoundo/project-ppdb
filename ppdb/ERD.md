# ERD — PPDB Database Schema (Periods & Waves)

Language: English (technical) · Business rules: see [`PRD.md`](../PRD.md)

> Scope of this iteration: only **`ppdb_periods`** and **`ppdb_waves`**.
> All other PPDB tables from the legacy schema are **dropped** and will be re-added in later iterations.

## Conventions

- Engine: `InnoDB`, charset `utf8mb4`, collation `utf8mb4_unicode_ci`.
- All PKs are `VARCHAR(36)` (UUID).
- Timestamps: `DATETIME(3)`, `NOT NULL` (`created_at`, `updated_at`).
- Status column: `VARCHAR(20)`, values only `active` | `inactive`, default `'inactive'`.
  - "Only one active" is **enforced at the application layer** (transaction), not by DB constraint.

## Table: ppdb_periods

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | | PK |
| `name` | VARCHAR(200) | NO | | e.g. `PPDB 2026/2027` |
| `academic_year` | VARCHAR(20) | NO | | e.g. `2026/2027` |
| `status` | VARCHAR(20) | NO | `'inactive'` | `active,inactive` |
| `description` | TEXT | YES | NULL | |
| `created_by` | VARCHAR(36) | YES | NULL | FK → users.id, ON DELETE SET NULL |
| `created_at` | DATETIME(3) | NO | | |
| `updated_at` | DATETIME(3) | NO | | |

Indexes:
- PK `id`
- KEY `idx_ppdb_periods_status (status)`
- CONSTRAINT FK `created_by` → `users(id)` ON DELETE SET NULL

```sql
CREATE TABLE IF NOT EXISTS ppdb_periods (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    academic_year VARCHAR(20) NOT NULL COMMENT 'e.g. 2026/2027',
    status VARCHAR(20) DEFAULT 'inactive' COMMENT 'active,inactive',
    description TEXT NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_ppdb_periods_status (status),
    CONSTRAINT fk_ppdb_periods_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Table: ppdb_waves

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | | PK |
| `period_id` | VARCHAR(36) | NO | | FK → ppdb_periods.id, ON DELETE CASCADE |
| `name` | VARCHAR(200) | NO | | e.g. `Gelombang 1` |
| `wave_number` | INT | NO | | auto = max+1 within period |
| `registration_start_date` | DATE | NO | | |
| `registration_end_date` | DATE | NO | | |
| `document_upload_end_date` | DATE | NO | | |
| `selection_date` | DATE | NO | | |
| `quota` | INT | NO | | |
| `status` | VARCHAR(20) | NO | `'inactive'` | `active,inactive` |
| `created_by` | VARCHAR(36) | YES | NULL | FK → users.id, ON DELETE SET NULL |
| `created_at` | DATETIME(3) | NO | | |
| `updated_at` | DATETIME(3) | NO | | |

Indexes:
- PK `id`
- UNIQUE `uk_ppdb_waves_period_number (period_id, wave_number)`
- KEY `idx_ppdb_waves_status (status)`
- CONSTRAINT FK `period_id` → `ppdb_periods(id)` ON DELETE CASCADE
- CONSTRAINT FK `created_by` → `users(id)` ON DELETE SET NULL

```sql
CREATE TABLE IF NOT EXISTS ppdb_waves (
    id VARCHAR(36) NOT NULL,
    period_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    wave_number INT NOT NULL,
    registration_start_date DATE NOT NULL,
    registration_end_date DATE NOT NULL,
    document_upload_end_date DATE NOT NULL,
    selection_date DATE NOT NULL,
    quota INT NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive' COMMENT 'active,inactive',
    created_by VARCHAR(36) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ppdb_waves_period_number (period_id, wave_number),
    KEY idx_ppdb_waves_status (status),
    CONSTRAINT fk_ppdb_waves_period FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE,
    CONSTRAINT fk_ppdb_waves_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Relationships

```
users 1 ──── 0..* ppdb_periods   (created_by, SET NULL)
users 1 ──── 0..* ppdb_waves     (created_by, SET NULL)
ppdb_periods 1 ──── 0..* ppdb_waves  (period_id, CASCADE)
```

- Deleting a period cascades to all its waves.
- `wave_number` uniqueness is scoped per period (`UNIQUE(period_id, wave_number)`); calculated by app as `MAX(wave_number)+1` within the period.

## Table: ppdb_applicants

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | VARCHAR(36) | NO | | PK |
| `wave_id` | VARCHAR(36) | NO | | FK → ppdb_waves.id |
| `user_id` | VARCHAR(36) | NO | | FK → users.id |
| `full_name` | VARCHAR(255) | NO | | |
| `email` | VARCHAR(100) | NO | | |
| `phone` | VARCHAR(20) | NO | | |
| `registration_path` | VARCHAR(50) | NO | | `reguler`, `pindahan` |
| `registration_level` | VARCHAR(50) | NO | | e.g. `SMP Kelas 7`, `SMA Kelas 10` |
| `birth_place` | VARCHAR(100) | YES | NULL | |
| `birth_date` | DATE | YES | NULL | |
| `gender` | VARCHAR(10) | YES | NULL | `L` or `P` |
| `nisn` | VARCHAR(50) | YES | NULL | |
| `parent_name` | VARCHAR(255) | YES | NULL | |
| `previous_school` | VARCHAR(255) | YES | NULL | |
| `major_choice` | VARCHAR(100) | YES | NULL | |
| `address` | TEXT | YES | NULL | |
| `status` | VARCHAR(20) | NO | `'pending_payment'` | `pending_payment, paid, document_upload, document_verified, selection, passed, failed, expired` |
| `created_at` | DATETIME(3) | NO | | |
| `updated_at` | DATETIME(3) | NO | | |

```sql
CREATE TABLE IF NOT EXISTS ppdb_applicants (
    id VARCHAR(36) NOT NULL,
    wave_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    registration_path VARCHAR(50) NOT NULL,
    registration_level VARCHAR(50) NOT NULL,
    birth_place VARCHAR(100) NULL,
    birth_date DATE NULL,
    gender VARCHAR(10) NULL,
    nisn VARCHAR(50) NULL,
    parent_name VARCHAR(255) NULL,
    previous_school VARCHAR(255) NULL,
    major_choice VARCHAR(100) NULL,
    address TEXT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment',
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ppdb_applicants_wave FOREIGN KEY (wave_id) REFERENCES ppdb_waves(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ppdb_applicants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Not in this iteration

Tables previously present in the legacy PPDB schema are **dropped**. They will be re-designed and re-added in future iterations.
