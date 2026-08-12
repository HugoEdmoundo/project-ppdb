> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-12: API â€” Document Requirements & Applicant Documents>

## Info

| Item | Value |
|------|-------|
| Phase | Phase 4 â€” Document Management |
| Priority | ðŸŸ¡ High |
| Estimasi | 2-3 hari |
| Dependencies | TASK-08 (API Applicant Registration) |

## Deskripsi

Membangun API untuk manajemen persyaratan dokumen dan dokumen yang diunggah oleh pendaftar. Modul ini mencakup konfigurasi jenis dokumen yang dibutuhkan per jenjang pendidikan, upload file dokumen oleh pendaftar, serta proses review (approve/reject/revision) oleh admin. Integrasi dengan tabel `file_uploads` untuk penyimpanan file.

## Scope

### Backend (API)

#### 1. Document Requirements CRUD

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/document-requirements` | List semua persyaratan dokumen (filter: level_id, is_required) |
| GET | `/api/v1/document-requirements/:id` | Detail persyaratan dokumen |
| POST | `/api/v1/document-requirements` | Buat persyaratan dokumen baru (Admin) |
| PUT | `/api/v1/document-requirements/:id` | Update persyaratan dokumen (Admin) |
| DELETE | `/api/v1/document-requirements/:id` | Soft delete persyaratan dokumen (Admin) |

**Request Body (POST/PUT):**
```json
{
  "level_id": "uuid",
  "code": "IJAZAH",
  "name": "Ijazah / Surat Keterangan Lulus",
  "description": "Scan ijazah atau SKL dari sekolah asal",
  "is_required": true,
  "max_file_size": 2097152,
  "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
  "sort_order": 1
}
```

**Validasi:**
- `code` harus unique per `level_id`
- `max_file_size` dalam bytes, default 2MB (2097152), max 10MB
- `allowed_extensions` minimal 1 extension
- `level_id` harus merujuk ke `education_levels` yang valid

#### 2. Applicant Documents â€” Upload

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/v1/applicants/:applicantId/documents` | Upload dokumen pendaftar |
| PUT | `/api/v1/applicants/:applicantId/documents/:id/re-upload` | Re-upload dokumen (setelah revision) |

**Upload Flow:**
1. Pendaftar memilih jenis dokumen (`document_requirement_id`) dan file
2. Server validasi:
   - File size â‰¤ `max_file_size` dari requirement
   - File extension sesuai `allowed_extensions`
   - Pendaftar belum upload dokumen ini (kecuali status `revision`)
3. File disimpan ke storage (local/S3)
4. Buat record di `file_uploads` dengan metadata file
5. Buat record di `applicant_documents` dengan status `pending`
6. Return document record dengan URL file

**Request (multipart/form-data):**
```
document_requirement_id: uuid
file: <binary>
notes: "Opsional catatan dari pendaftar"
```

**Re-upload Flow:**
1. Validasi status dokumen harus `revision`
2. Upload file baru, buat record `file_uploads` baru
3. Update `applicant_documents`: file_upload_id baru, status kembali ke `pending`, reset review fields

#### 3. Applicant Documents â€” List & Detail

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/applicants/:applicantId/documents` | List semua dokumen pendaftar dengan status |
| GET | `/api/v1/applicants/:applicantId/documents/:id` | Detail dokumen |
| GET | `/api/v1/applicants/me/documents` | List dokumen milik sendiri (pendaftar) |
| GET | `/api/v1/applicants/me/document-checklist` | Checklist lengkap (termasuk yang belum upload) |

**Document Checklist Response:**
```json
{
  "data": [
    {
      "requirement": {
        "id": "uuid",
        "code": "IJAZAH",
        "name": "Ijazah / Surat Keterangan Lulus",
        "is_required": true,
        "max_file_size": 2097152,
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"]
      },
      "document": {
        "id": "uuid",
        "status": "approved",
        "file_url": "/uploads/documents/xxx.pdf",
        "uploaded_at": "2026-07-10T10:00:00Z",
        "reviewed_at": "2026-07-10T12:00:00Z",
        "review_notes": null
      }
    },
    {
      "requirement": {
        "id": "uuid",
        "code": "KK",
        "name": "Kartu Keluarga",
        "is_required": true
      },
      "document": null
    }
  ],
  "summary": {
    "total_required": 5,
    "uploaded": 3,
    "approved": 2,
    "pending": 1,
    "rejected": 0,
    "revision": 0
  }
}
```

#### 4. Document Review (Admin)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/admin/documents/review-queue` | Antrian dokumen pending review |
| PUT | `/api/v1/admin/documents/:id/review` | Review dokumen (approve/reject/revision) |
| GET | `/api/v1/admin/documents/statistics` | Statistik review dokumen |

**Review Request:**
```json
{
  "status": "approved",
  "review_notes": "Dokumen valid dan terbaca jelas"
}
```

**Status Flow:**
```
pending â†’ approved    (admin approve)
pending â†’ rejected    (admin reject â€” final, butuh upload ulang jenis berbeda)
pending â†’ revision    (admin minta revisi â€” pendaftar re-upload)
revision â†’ pending    (pendaftar re-upload)
```

**Review Queue Filters:**
- `status`: pending (default), all
- `level_id`: filter per jenjang
- `wave_id`: filter per gelombang
- `requirement_code`: filter per jenis dokumen
- Sorting: oldest first (FIFO), newest first
- Pagination

**Statistik Response:**
```json
{
  "total_pending": 45,
  "total_approved": 120,
  "total_rejected": 5,
  "total_revision": 12,
  "avg_review_time_hours": 4.5,
  "by_requirement": [
    { "code": "IJAZAH", "pending": 10, "approved": 30 },
    { "code": "KK", "pending": 15, "approved": 25 }
  ]
}
```

### Database

| Tabel | Deskripsi |
|-------|-----------|
| `document_requirements` | Konfigurasi jenis dokumen per jenjang |
| `applicant_documents` | Dokumen yang diupload pendaftar |
| `file_uploads` | Metadata file yang diupload |

**Key Fields â€” `document_requirements`:**
- `id`, `level_id`, `code`, `name`, `description`
- `is_required`, `max_file_size`, `allowed_extensions`
- `sort_order`, `is_active`
- `created_at`, `updated_at`, `deleted_at`

**Key Fields â€” `applicant_documents`:**
- `id`, `applicant_id`, `document_requirement_id`, `file_upload_id`
- `status` (enum: pending, approved, rejected, revision)
- `notes` (catatan pendaftar)
- `reviewed_by`, `reviewed_at`, `review_notes`
- `created_at`, `updated_at`

**Key Fields â€” `file_uploads`:**
- `id`, `uploader_id`, `original_name`, `stored_name`
- `mime_type`, `file_size`, `storage_path`
- `created_at`

## Acceptance Criteria

- [ ] Admin dapat CRUD persyaratan dokumen per jenjang pendidikan
- [ ] Validasi `code` unique per `level_id`
- [ ] Pendaftar dapat upload dokumen sesuai persyaratan
- [ ] Validasi file size dan extension sesuai konfigurasi requirement
- [ ] Pendaftar tidak bisa upload duplikat dokumen (kecuali status revision)
- [ ] File tersimpan di storage dan record tercatat di `file_uploads`
- [ ] Admin dapat melihat antrian review dokumen dengan filter dan pagination
- [ ] Admin dapat approve/reject/revision dokumen dengan catatan
- [ ] Status flow dokumen berjalan sesuai diagram (pending â†’ approved/rejected/revision)
- [ ] Pendaftar dapat re-upload dokumen yang berstatus revision
- [ ] Document checklist endpoint menampilkan semua requirement + status upload
- [ ] Summary statistik dokumen tersedia (total per status)
- [ ] Endpoint `/me/documents` hanya menampilkan dokumen milik pendaftar yang login
- [ ] Semua endpoint terproteksi dengan auth middleware dan role check

## Technical Notes

- File upload gunakan `multipart/form-data`, parse dengan library seperti `@hono/multipart` atau `formidable`
- Storage strategy: mulai dengan local file system (folder `uploads/documents/`), siapkan abstraction layer untuk migrasi ke S3/MinIO
- Stored filename: gunakan format `{uuid}_{timestamp}.{ext}` untuk menghindari collision
- Untuk file serving, buat endpoint `/api/v1/files/:id` yang:
  - Cek auth (hanya pemilik dokumen atau admin yang bisa akses)
  - Set header `Content-Type` sesuai mime type
  - Stream file dari storage
- Max file size global bisa di-set di middleware Hono:
  ```typescript
  app.use('/api/v1/applicants/*/documents', async (c, next) => {
    // Check content-length header before parsing
    const contentLength = parseInt(c.req.header('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB absolute max
      return c.json({ error: 'File too large' }, 413);
    }
    await next();
  });
  ```
- Gunakan database transaction untuk operasi upload (insert `file_uploads` + `applicant_documents`)
- Review queue: index pada `status` dan `created_at` untuk performa query
- Pertimbangkan background job untuk:
  - Generate thumbnail untuk file gambar
  - Virus scan (future enhancement)
  - Notifikasi ke pendaftar setelah review

</TASK-12: API â€” Document Requirements & Applicant Documents>

