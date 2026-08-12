> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-23: API â€” Academic Calendar>

## Info

| Item | Value |
|------|-------|
| Phase | 8 â€” Notifikasi & Kalender |
| Priority | ðŸŸ¢ Medium |
| Estimasi | 1 hari |
| Dependencies | TASK-01 |

## Deskripsi

Membuat API CRUD untuk kalender akademik yang menampilkan event-event penting terkait proses PPDB. Kalender ini mencakup jadwal pendaftaran, tes seleksi, pengumuman, registrasi ulang, MPLS, dan event akademik lainnya. Terdapat endpoint publik agar calon pendaftar dapat melihat jadwal tanpa login.

## Scope

### Backend (API)

#### Academic Calendar
- `GET /api/academic-calendars` â€” List semua event kalender akademik (admin, dengan pagination)
- `POST /api/academic-calendars` â€” Buat event kalender baru (admin)
- `GET /api/academic-calendars/:id` â€” Detail event kalender
- `PUT /api/academic-calendars/:id` â€” Update event kalender (admin)
- `DELETE /api/academic-calendars/:id` â€” Hapus event kalender (admin, soft delete)
- `GET /api/public/academic-calendar` â€” Public endpoint: list event kalender dengan filter date range (tanpa auth)

#### Query Parameters (untuk list endpoints)
- `start_date` â€” Filter event mulai dari tanggal tertentu
- `end_date` â€” Filter event sampai tanggal tertentu
- `page` â€” Nomor halaman (pagination)
- `limit` â€” Jumlah item per halaman
- `search` â€” Pencarian berdasarkan title/description

### Database

#### Tabel `academic_calendars`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | nullable |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL |
| event_type | VARCHAR(50) | nullable (registration, test, announcement, re_registration, mpls, general) |
| is_public | BOOLEAN | default true |
| color | VARCHAR(7) | nullable (hex color untuk UI calendar, e.g., '#FF5733') |
| created_by | UUID | FK â†’ users.id |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |
| deleted_at | TIMESTAMP | nullable (soft delete) |

## Acceptance Criteria

- [ ] Admin dapat membuat event kalender akademik baru
- [ ] Admin dapat melihat list semua event kalender dengan pagination
- [ ] Admin dapat mengupdate event kalender
- [ ] Admin dapat menghapus event kalender (soft delete)
- [ ] Public endpoint mengembalikan event kalender tanpa memerlukan autentikasi
- [ ] Filter date range berfungsi dengan benar (start_date, end_date)
- [ ] Search berdasarkan title dan description berfungsi
- [ ] Validasi: `end_date` harus >= `start_date`
- [ ] Event yang sudah soft-deleted tidak muncul di list (kecuali admin request khusus)
- [ ] Response format konsisten dengan API lainnya

## Technical Notes

- Public endpoint tidak memerlukan JWT token â€” gunakan middleware khusus atau skip auth
- Pertimbangkan menambahkan field `event_type` untuk kategori event agar bisa difilter dan diberi warna berbeda di calendar UI
- Date range filter menggunakan overlap logic: tampilkan event yang overlap dengan range yang diminta (`event.start_date <= filter.end_date AND event.end_date >= filter.start_date`)
- Untuk performance, tambahkan index pada kolom `start_date` dan `end_date`
- Color field opsional â€” jika tidak diisi, frontend akan menggunakan warna default berdasarkan event_type
- Endpoint ini relatif sederhana, bisa dijadikan referensi pattern untuk CRUD endpoints lainnya

</TASK-23: API â€” Academic Calendar>

