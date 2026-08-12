> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-20: API â€” MOU, Acceptance Letters, Re-registration, MPLS>

## Info

| Item | Value |
|------|-------|
| Phase | 7 â€” Post-Seleksi & Penerimaan |
| Priority | ðŸŸ¢ Medium |
| Estimasi | 2-3 hari |
| Dependencies | TASK-18 |

## Deskripsi

Membuat API endpoints untuk proses pasca-seleksi meliputi pengelolaan MOU (Memorandum of Understanding), surat penerimaan (acceptance letters), registrasi ulang, dan MPLS (Masa Pengenalan Lingkungan Sekolah). Task ini mencakup CRUD untuk template MOU, generate MOU per pendaftar, proses upload dan approval MOU yang sudah ditandatangani, auto-generate surat penerimaan, manajemen jadwal registrasi ulang beserta pencatatan kehadiran, serta manajemen jadwal MPLS dan penugasan peserta didik baru.

## Scope

### Backend (API)

#### MOU Templates
- `GET /api/mou-templates` â€” List semua template MOU (dengan pagination)
- `POST /api/mou-templates` â€” Buat template MOU baru
- `GET /api/mou-templates/:id` â€” Detail template MOU
- `PUT /api/mou-templates/:id` â€” Update template MOU
- `DELETE /api/mou-templates/:id` â€” Hapus template MOU (soft delete)

#### Applicant MOUs
- `POST /api/applicant-mous/generate` â€” Generate MOU dari template untuk applicant tertentu
- `GET /api/applicant-mous` â€” List semua MOU pendaftar (admin, dengan filter status)
- `GET /api/applicant-mous/:id` â€” Detail MOU pendaftar
- `GET /api/applicant-mous/my` â€” MOU milik applicant yang sedang login
- `POST /api/applicant-mous/:id/upload` â€” Upload MOU yang sudah ditandatangani (oleh applicant)
- `PUT /api/applicant-mous/:id/review` â€” Review MOU: approve atau reject (oleh admin seleksi)
- `GET /api/applicant-mous/:id/download` â€” Download file MOU

#### Acceptance Letters
- `POST /api/acceptance-letters/generate` â€” Auto-generate surat penerimaan (single applicant)
- `POST /api/acceptance-letters/generate-batch` â€” Batch generate surat penerimaan untuk semua applicant yang lulus + pembayaran lunas
- `GET /api/acceptance-letters` â€” List surat penerimaan (admin)
- `GET /api/acceptance-letters/:id` â€” Detail surat penerimaan
- `GET /api/acceptance-letters/my` â€” Surat penerimaan milik applicant yang login
- `GET /api/acceptance-letters/:id/download` â€” Download file surat penerimaan

#### Re-registrations
- `POST /api/re-registrations` â€” Buat jadwal registrasi ulang untuk applicant
- `GET /api/re-registrations` â€” List jadwal registrasi ulang (admin, dengan filter)
- `GET /api/re-registrations/:id` â€” Detail registrasi ulang
- `GET /api/re-registrations/my` â€” Jadwal registrasi ulang milik applicant
- `PUT /api/re-registrations/:id` â€” Update jadwal registrasi ulang
- `PUT /api/re-registrations/:id/attend` â€” Catat kehadiran registrasi ulang
- `PUT /api/re-registrations/:id/status` â€” Update status (scheduled/attended/missed)

#### MPLS Schedules
- `GET /api/mpls-schedules` â€” List jadwal MPLS
- `POST /api/mpls-schedules` â€” Buat jadwal MPLS baru
- `GET /api/mpls-schedules/:id` â€” Detail jadwal MPLS
- `PUT /api/mpls-schedules/:id` â€” Update jadwal MPLS
- `DELETE /api/mpls-schedules/:id` â€” Hapus jadwal MPLS (soft delete)

#### Applicant MPLS
- `POST /api/applicant-mpls` â€” Assign applicant ke jadwal MPLS
- `POST /api/applicant-mpls/batch` â€” Batch assign applicants ke jadwal MPLS
- `GET /api/applicant-mpls` â€” List penugasan MPLS (admin)
- `GET /api/applicant-mpls/my` â€” Info MPLS milik applicant
- `DELETE /api/applicant-mpls/:id` â€” Hapus penugasan MPLS

### Database

#### Tabel `mou_templates`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK, default gen_random_uuid() |
| name | VARCHAR(255) | NOT NULL |
| template_file | TEXT | NOT NULL (URL/path ke file template) |
| version | VARCHAR(50) | NOT NULL, default '1.0' |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

#### Tabel `applicant_mous`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| applicant_id | UUID | FK â†’ applicants.id, NOT NULL |
| mou_template_id | UUID | FK â†’ mou_templates.id, NOT NULL |
| generated_file_url | TEXT | URL file MOU yang di-generate |
| signed_file_url | TEXT | URL file MOU yang sudah ditandatangani |
| status | VARCHAR(20) | NOT NULL, default 'generated' (generated/uploaded/approved/rejected) |
| rejection_reason | TEXT | nullable |
| reviewed_by | UUID | FK â†’ users.id, nullable |
| reviewed_at | TIMESTAMP | nullable |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

#### Tabel `acceptance_letters`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| applicant_id | UUID | FK â†’ applicants.id, NOT NULL, UNIQUE |
| document_number | VARCHAR(100) | NOT NULL, UNIQUE |
| file_url | TEXT | NOT NULL |
| generated_at | TIMESTAMP | NOT NULL, default now() |
| generated_by | UUID | FK â†’ users.id |
| created_at | TIMESTAMP | default now() |

#### Tabel `re_registrations`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| applicant_id | UUID | FK â†’ applicants.id, NOT NULL |
| schedule_date | TIMESTAMP | NOT NULL |
| attended_at | TIMESTAMP | nullable |
| status | VARCHAR(20) | NOT NULL, default 'scheduled' (scheduled/attended/missed) |
| notes | TEXT | nullable |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

#### Tabel `mpls_schedules`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| title | VARCHAR(255) | NOT NULL |
| start_date | TIMESTAMP | NOT NULL |
| end_date | TIMESTAMP | NOT NULL |
| description | TEXT | nullable |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

#### Tabel `applicant_mpls`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| applicant_id | UUID | FK â†’ applicants.id, NOT NULL |
| mpls_schedule_id | UUID | FK â†’ mpls_schedules.id, NOT NULL |
| created_at | TIMESTAMP | default now() |
| UNIQUE | (applicant_id, mpls_schedule_id) | |

## Acceptance Criteria

- [ ] CRUD endpoint `mou_templates` berfungsi lengkap (create, read, update, soft-delete)
- [ ] MOU dapat di-generate dari template dengan data applicant yang terisi otomatis
- [ ] Applicant dapat mengupload file MOU yang sudah ditandatangani
- [ ] Admin seleksi dapat mereview (approve/reject) MOU yang diupload
- [ ] Status MOU berubah sesuai flow: generated â†’ uploaded â†’ approved/rejected
- [ ] Surat penerimaan hanya bisa di-generate untuk applicant dengan status lulus DAN pembayaran lengkap
- [ ] Batch generation surat penerimaan berfungsi dengan benar
- [ ] Document number pada acceptance letter unik dan ter-generate otomatis
- [ ] CRUD registrasi ulang berfungsi dengan pencatatan kehadiran
- [ ] Status registrasi ulang berubah sesuai: scheduled â†’ attended/missed
- [ ] CRUD jadwal MPLS berfungsi lengkap
- [ ] Applicant dapat di-assign ke jadwal MPLS secara individual maupun batch
- [ ] Endpoint `my` mengembalikan data yang sesuai dengan applicant yang sedang login
- [ ] Semua endpoint memiliki validasi input dan error handling yang konsisten
- [ ] Authorization: hanya role yang sesuai yang bisa mengakses endpoint tertentu

## Technical Notes

- MOU template bisa menggunakan format DOCX dengan placeholder ({{applicant_name}}, {{nik}}, dll.) yang di-replace saat generate
- Gunakan library seperti `docxtemplater` untuk DOCX template processing
- Untuk acceptance letter, buat format penomoran otomatis: `SKP/{TAHUN}/{NOMOR_URUT}`
- Upload signed MOU harus dibatasi tipe file (PDF only) dan ukuran (max 5MB)
- Pertimbangkan cron job untuk auto-update status registrasi ulang menjadi 'missed' jika tanggal sudah lewat
- Validasi: saat generate MOU, pastikan applicant sudah lulus seleksi
- Validasi: saat generate acceptance letter, pastikan pembayaran tahap terakhir sudah lunas
- Batch assign MPLS sebaiknya menggunakan transaction untuk menjaga konsistensi data

</TASK-20: API â€” MOU, Acceptance Letters, Re-registration, MPLS>

