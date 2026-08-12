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
| `start_date` | DATE | NO | | |
| `end_date` | DATE | NO | | |
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
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
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
| `start_date` | DATE | NO | | |
| `end_date` | DATE | NO | | |
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
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
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

## Not in this iteration

Tables previously present in the legacy PPDB schema (education_levels, registration_categories, selection_flows, wave_configurations, applicants, payment_stages, invoices, notifications, dashboard_statistics, etc.) are **dropped**. They will be re-designed and re-added in future iterations.
