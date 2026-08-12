> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# ERD Sistem PPDB Terintegrasi Pesantren / Sekolah

## 1. MASTER USER & AUTHENTICATION

### users

| Field         | Type      |
| ------------- | --------- |
| id            | bigint PK |
| username      | varchar   |
| email         | varchar   |
| password_hash | varchar   |
| is_active     | boolean   |
| last_login_at | datetime  |
| created_at    | datetime  |
| updated_at    | datetime  |

### roles

| Field       | Type      |
| ----------- | --------- |
| id          | bigint PK |
| name        | varchar   |
| description | text      |

### user_roles

| Field   | Type      |
| ------- | --------- |
| id      | bigint PK |
| user_id | FK users  |
| role_id | FK roles  |

### refresh_tokens

| Field      | Type      |
| ---------- | --------- |
| id         | bigint PK |
| user_id    | FK users  |
| token      |           |
| expired_at |           |
| revoked_at |           |

---

# 2. PERIODE PPDB

### ppdb_periods
*(Catatan: Sistem didesain agar hanya ada maksimal 1 periode dengan status = 'active' pada satu waktu. Saat sebuah periode diaktifkan, periode lain otomatis non-aktif. Data di Dashboard dan tabel-tabel utama secara default akan merujuk pada periode yang berstatus 'active' ini).*

| Field      |
| ---------- |
| id PK      |
| name       |
| year       |
| start_date |
| end_date   |
| status     |
| created_by |

### ppdb_waves

| Field                  |
| ---------------------- |
| id PK                  |
| period_id FK           |
| name                   |
| start_date             |
| end_date               |
| quota                  |
| waiting_list_enabled   |
| auto_move_next_wave    |
| default_discount_type  |
| default_discount_value |
| status                 |

---

# 3. MASTER JENJANG

### education_levels

| Field       |
| ----------- |
| id PK       |
| code        |
| name        |
| description |

Contoh:

* SMP
* SMA
* SMK
* Pesantren Tahfidz

---

# 4. MASTER KATEGORI PENDAFTARAN

### registration_categories

| Field       |
| ----------- |
| id PK       |
| code        |
| name        |
| description |

Contoh:

* Reguler
* Prestasi
* Tahfidz
* Beasiswa

---

# 5. FLOW SELEKSI DINAMIS

### selection_flows

| Field       |
| ----------- |
| id PK       |
| name        |
| description |
| is_active   |

### selection_flow_steps

| Field       |
| ----------- |
| id PK       |
| flow_id FK  |
| sequence    |
| code        |
| name        |
| step_type   |
| is_required |

Contoh:

1. Pembayaran
2. Dokumen
3. Tes Akademik
4. Psikotes
5. MOU
6. Pembayaran Akhir

---

# 6. KONFIGURASI GELOMBANG

### wave_configurations

| Field               |
| ------------------- |
| id PK               |
| wave_id FK          |
| level_id FK         |
| category_id FK      |
| flow_id FK          |
| payment_stage_count |
| quota               |
| status              |

---

# 7. CALON PESERTA

### applicants

| Field               |
| ------------------- |
| id PK               |
| user_id FK          |
| registration_number |
| period_id FK        |
| wave_id FK          |
| level_id FK         |
| category_id FK      |
| current_status      |
| registration_date   |
| is_waiting_list     |

---

# 8. DATA PRIBADI PESERTA

### applicant_profiles

| Field              |
| ------------------ |
| applicant_id PK FK |
| full_name          |
| gender             |
| birth_place        |
| birth_date         |
| religion           |
| phone              |
| email              |
| address            |
| province           |
| city               |
| district           |
| village            |
| postal_code        |

---

# 9. DATA ORANG TUA

### applicant_parents

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| parent_type     |
| full_name       |
| phone           |
| occupation      |
| income          |
| address         |

parent_type:

* father
* mother
* guardian

---

# 10. STATUS HISTORY

### applicant_status_histories

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| old_status      |
| new_status      |
| changed_by      |
| notes           |
| created_at      |

---

# 11. MASTER DOKUMEN

### document_requirements

| Field         |
| ------------- |
| id PK         |
| level_id FK   |
| code          |
| name          |
| is_required   |
| max_file_size |

---

# 12. DOKUMEN PESERTA

### applicant_documents

| Field                      |
| -------------------------- |
| id PK                      |
| applicant_id FK            |
| document_requirement_id FK |
| file_url                   |
| status                     |
| review_notes               |
| reviewed_by                |
| reviewed_at                |

status:

* pending
* approved
* rejected
* revision

---

# 13. MASTER TES

### test_types

| Field       |
| ----------- |
| id PK       |
| code        |
| name        |
| description |

Contoh:

* Akademik
* Hafalan
* Baca Quran
* Psikotes
* Interview

---

# 14. PARAMETER TES

### test_parameters

| Field           |
| --------------- |
| id PK           |
| test_type_id FK |
| parameter_name  |
| max_score       |
| weight          |

---

# 15. SESI TES

### test_sessions

| Field           |
| --------------- |
| id PK           |
| test_type_id FK |
| session_name    |
| test_date       |
| start_time      |
| end_time        |
| location        |
| capacity        |

---

# 16. PENUGASAN PESERTA TES

### applicant_test_sessions

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| session_id FK   |
| assigned_by     |
| assigned_at     |

---

# 17. HASIL TES

### applicant_test_results

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| test_type_id FK |
| total_score     |
| recommendation  |
| evaluator_id    |
| evaluated_at    |

---

# 18. DETAIL NILAI TES

### applicant_test_scores

| Field           |
| --------------- |
| id PK           |
| result_id FK    |
| parameter_id FK |
| score           |

---

# 19. RULE KELULUSAN

### graduation_rules

| Field         |
| ------------- |
| id PK         |
| wave_id FK    |
| mode          |
| minimum_score |
| created_by    |

mode:

* manual
* automatic
* hybrid

---

# 20. HASIL KELULUSAN

### applicant_graduations

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| final_score     |
| recommendation  |
| decision        |
| approved_by     |
| approved_at     |

---

# 21. DISKON

### discounts

| Field         |
| ------------- |
| id PK         |
| name          |
| discount_type |
| value         |
| description   |

---

# 22. DISKON PESERTA

### applicant_discounts

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| discount_id FK  |
| granted_by      |
| notes           |

---

# 23. TAHAP PEMBAYARAN

### payment_stages

| Field        |
| ------------ |
| id PK        |
| wave_id FK   |
| stage_number |
| stage_name   |
| amount       |
| due_days     |

---

# 24. INVOICE

### invoices

| Field               |
| ------------------- |
| id PK               |
| applicant_id FK     |
| payment_stage_id FK |
| invoice_number      |
| amount              |
| discount_amount     |
| final_amount        |
| due_date            |
| status              |

---

# 25. TRANSAKSI PEMBAYARAN

### payment_transactions

| Field             |
| ----------------- |
| id PK             |
| invoice_id FK     |
| gateway_reference |
| payment_method    |
| amount            |
| status            |
| paid_at           |
| raw_response_json |

---

# 26. CICILAN

### installment_plans

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| total_amount    |
| tenor           |
| start_date      |
| end_date        |

---

# 27. DETAIL CICILAN

### installment_schedules

| Field              |
| ------------------ |
| id PK              |
| plan_id FK         |
| installment_number |
| amount             |
| due_date           |
| status             |

---

# 28. MOU

### mou_templates

| Field         |
| ------------- |
| id PK         |
| name          |
| template_file |
| version       |

### applicant_mous

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| template_id FK  |
| generated_file  |
| uploaded_file   |
| status          |
| review_notes    |
| approved_by     |

---

# 29. SURAT PENERIMAAN

### acceptance_letters

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| document_number |
| file_url        |
| generated_at    |

---

# 30. REGISTRASI ULANG

### re_registrations

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| schedule_date   |
| attended_at     |
| status          |

---

# 31. MPLS

### mpls_schedules

| Field       |
| ----------- |
| id PK       |
| title       |
| start_date  |
| end_date    |
| description |

### applicant_mpls

| Field               |
| ------------------- |
| id PK               |
| applicant_id FK     |
| mpls_schedule_id FK |

---

# 32. KALENDER AKADEMIK

### academic_calendars

| Field       |
| ----------- |
| id PK       |
| title       |
| description |
| start_date  |
| end_date    |

---

# 33. NOTIFIKASI

### notifications

| Field           |
| --------------- |
| id PK           |
| applicant_id FK |
| channel         |
| subject         |
| content         |
| status          |
| sent_at         |

channel:

* email
* whatsapp

---

# 34. TEMPLATE NOTIFIKASI

### notification_templates

| Field   |
| ------- |
| id PK   |
| code    |
| channel |
| title   |
| body    |

---

# 35. FILE STORAGE

### file_uploads

| Field       |
| ----------- |
| id PK       |
| owner_type  |
| owner_id    |
| file_name   |
| file_path   |
| mime_type   |
| file_size   |
| uploaded_by |

---

# 36. AUDIT TRAIL

### audit_logs

| Field         |
| ------------- |
| id PK         |
| user_id FK    |
| role_name     |
| module        |
| action        |
| entity_name   |
| entity_id     |
| old_data_json |
| new_data_json |
| ip_address    |
| user_agent    |
| created_at    |

---

# 37. DASHBOARD SNAPSHOT

### dashboard_statistics

| Field        |
| ------------ |
| id PK        |
| period_id FK |
| metric_name  |
| metric_value |
| generated_at |

---

# RELATIONSHIP SUMMARY

users
â†’ applicants

roles
â†’ user_roles

ppdb_periods
â†’ ppdb_waves

ppdb_waves
â†’ wave_configurations
â†’ payment_stages

education_levels
â†’ wave_configurations

registration_categories
â†’ wave_configurations

selection_flows
â†’ selection_flow_steps

applicants
â†’ applicant_profiles
â†’ applicant_parents
â†’ applicant_documents
â†’ applicant_test_results
â†’ invoices
â†’ applicant_discounts
â†’ applicant_mous
â†’ acceptance_letters
â†’ re_registrations
â†’ installment_plans
â†’ notifications
â†’ applicant_status_histories

test_types
â†’ test_parameters
â†’ test_sessions

applicant_test_results
â†’ applicant_test_scores

installment_plans
â†’ installment_schedules

invoices
â†’ payment_transactions

users
â†’ audit_logs

