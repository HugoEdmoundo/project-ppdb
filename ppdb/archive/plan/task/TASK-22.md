> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

<TASK-22: API â€” Notification Center & Templates>

## Info

| Item | Value |
|------|-------|
| Phase | 8 â€” Notifikasi & Kalender |
| Priority | ðŸŸ¢ Medium |
| Estimasi | 2-3 hari |
| Dependencies | TASK-01 |

## Deskripsi

Membuat sistem notifikasi terpusat yang mendukung multiple channel (email dan WhatsApp). Sistem ini mencakup manajemen template notifikasi dengan template variables, pengiriman notifikasi baik secara manual maupun otomatis pada trigger point tertentu, integrasi dengan layanan WhatsApp (Fonnte/Woowa) dan Email (SMTP/Mailgun), mekanisme retry untuk notifikasi yang gagal, serta riwayat notifikasi per pendaftar.

## Scope

### Backend (API)

#### Notification Templates
- `GET /api/notification-templates` â€” List semua template notifikasi (dengan pagination dan filter channel)
- `POST /api/notification-templates` â€” Buat template notifikasi baru
- `GET /api/notification-templates/:id` â€” Detail template notifikasi
- `PUT /api/notification-templates/:id` â€” Update template notifikasi
- `DELETE /api/notification-templates/:id` â€” Hapus template notifikasi (soft delete)
- `GET /api/notification-templates/variables` â€” List semua available template variables

#### Notifications (Send & History)
- `POST /api/notifications/send` â€” Kirim notifikasi ke satu applicant
- `POST /api/notifications/send-bulk` â€” Kirim notifikasi ke banyak applicant sekaligus
- `GET /api/notifications` â€” List semua notifikasi (admin, dengan filter status/channel/date)
- `GET /api/notifications/:id` â€” Detail notifikasi
- `GET /api/notifications/my` â€” Riwayat notifikasi milik applicant yang login
- `PUT /api/notifications/:id/read` â€” Tandai notifikasi sebagai sudah dibaca (applicant)
- `POST /api/notifications/retry/:id` â€” Retry pengiriman notifikasi yang gagal
- `GET /api/notifications/stats` â€” Statistik notifikasi (total sent, failed, pending per channel)

#### Notification Service (Internal)
- Service layer untuk integrasi WhatsApp API (Fonnte/Woowa)
- Service layer untuk integrasi Email (SMTP/Mailgun)
- Auto-trigger service: mengirim notifikasi otomatis pada event tertentu
- Queue/retry mechanism untuk failed notifications

### Database

#### Tabel `notification_templates`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| code | VARCHAR(100) | NOT NULL, UNIQUE (e.g., 'REGISTRATION_SUCCESS', 'PAYMENT_REMINDER') |
| channel | VARCHAR(20) | NOT NULL (email/whatsapp) |
| title | VARCHAR(255) | NOT NULL |
| body | TEXT | NOT NULL (supports template variables) |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

#### Tabel `notifications`
| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| applicant_id | UUID | FK â†’ applicants.id, NOT NULL |
| template_id | UUID | FK â†’ notification_templates.id, nullable |
| channel | VARCHAR(20) | NOT NULL (email/whatsapp) |
| recipient | VARCHAR(255) | NOT NULL (email address atau phone number) |
| subject | VARCHAR(255) | nullable (untuk email) |
| content | TEXT | NOT NULL (body setelah template variables di-resolve) |
| status | VARCHAR(20) | NOT NULL, default 'pending' (pending/sent/failed) |
| sent_at | TIMESTAMP | nullable |
| error_message | TEXT | nullable (pesan error jika gagal) |
| retry_count | INTEGER | default 0 |
| max_retries | INTEGER | default 3 |
| is_read | BOOLEAN | default false |
| read_at | TIMESTAMP | nullable |
| triggered_by | VARCHAR(50) | nullable (manual/auto, nama trigger point) |
| created_at | TIMESTAMP | default now() |
| updated_at | TIMESTAMP | default now() |

### Template Variables

Variabel yang tersedia untuk template notifikasi:

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `{{applicant_name}}` | Nama lengkap pendaftar | Ahmad Fauzi |
| `{{registration_number}}` | Nomor registrasi | REG-2026-001 |
| `{{status}}` | Status pendaftaran saat ini | Verified |
| `{{jenjang}}` | Jenjang pendidikan | SMP |
| `{{gelombang}}` | Gelombang pendaftaran | Gelombang 1 |
| `{{payment_amount}}` | Jumlah pembayaran | Rp 5.000.000 |
| `{{payment_deadline}}` | Batas pembayaran | 15 Juli 2026 |
| `{{test_date}}` | Tanggal tes | 20 Juli 2026 |
| `{{test_location}}` | Lokasi tes | Gedung A, Lantai 2 |
| `{{graduation_status}}` | Status kelulusan | Lulus |
| `{{school_name}}` | Nama sekolah | PT Dar Rahman |
| `{{current_date}}` | Tanggal saat ini | 10 Juli 2026 |

### Notification Trigger Points

| Trigger | Template Code | Channel |
|---------|---------------|---------|
| Registrasi berhasil | `REGISTRATION_SUCCESS` | Email + WhatsApp |
| Pembayaran diterima | `PAYMENT_RECEIVED` | Email + WhatsApp |
| Pengingat pembayaran | `PAYMENT_REMINDER` | WhatsApp |
| Dokumen diterima | `DOCUMENT_APPROVED` | WhatsApp |
| Dokumen ditolak | `DOCUMENT_REJECTED` | WhatsApp |
| Jadwal tes ditetapkan | `TEST_SCHEDULED` | Email + WhatsApp |
| Pengingat tes | `TEST_REMINDER` | WhatsApp |
| Pengumuman kelulusan | `GRADUATION_ANNOUNCEMENT` | Email + WhatsApp |
| Surat penerimaan tersedia | `ACCEPTANCE_LETTER_READY` | Email + WhatsApp |
| MOU ready for download | `MOU_GENERATED` | WhatsApp |
| MOU approved | `MOU_APPROVED` | WhatsApp |
| MOU rejected | `MOU_REJECTED` | WhatsApp |

## Acceptance Criteria

- [ ] CRUD template notifikasi berfungsi lengkap
- [ ] Template mendukung variabel placeholder yang di-resolve saat pengiriman
- [ ] Endpoint `/variables` mengembalikan daftar variabel yang tersedia
- [ ] Notifikasi dapat dikirim via email dengan benar
- [ ] Notifikasi dapat dikirim via WhatsApp dengan benar
- [ ] Bulk send berfungsi untuk mengirim ke banyak applicant sekaligus
- [ ] Status notifikasi tercatat dengan benar (pending â†’ sent/failed)
- [ ] Notifikasi yang gagal dapat di-retry
- [ ] Retry mechanism otomatis berjalan (max 3 retries)
- [ ] Error message tercatat saat pengiriman gagal
- [ ] Applicant dapat melihat riwayat notifikasi yang diterima
- [ ] Applicant dapat menandai notifikasi sebagai sudah dibaca
- [ ] Auto-trigger notification berjalan pada setiap trigger point yang ditentukan
- [ ] Statistik notifikasi (sent/failed/pending) tersedia
- [ ] Semua endpoint memiliki proper authorization

## Technical Notes

- **WhatsApp Integration**: Gunakan Fonnte API (`https://api.fonnte.com/send`) atau Woowa API. Simpan API key di environment variable. Buat abstraction layer agar mudah switch provider.
- **Email Integration**: Gunakan `nodemailer` dengan SMTP atau Mailgun API. Konfigurasi SMTP di environment variable (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
- **Template Variable Resolution**: Buat fungsi `resolveTemplate(template: string, variables: Record<string, string>)` yang me-replace semua `{{variable}}` dengan nilai aktual.
- **Retry Mechanism**: Implementasikan exponential backoff untuk retry (1 min, 5 min, 15 min). Bisa menggunakan simple cron job atau queue system sederhana.
- **Bulk Send**: Untuk pengiriman massal, gunakan queue agar tidak overload API provider. Batasi rate: max 20 messages/minute untuk WhatsApp.
- **Auto-trigger**: Buat event-based system menggunakan custom event emitter atau simple function calls pada setiap action point (e.g., setelah payment confirmed, panggil `notificationService.trigger('PAYMENT_RECEIVED', applicantId)`).
- **Environment Variables yang diperlukan**:
  ```
  WHATSAPP_API_KEY=
  WHATSAPP_API_URL=
  SMTP_HOST=
  SMTP_PORT=
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM_EMAIL=
  SMTP_FROM_NAME=
  ```
- Pertimbangkan membuat notification channel sebagai plugin/adapter pattern agar mudah menambah channel baru di masa depan (e.g., SMS, push notification)

</TASK-22: API â€” Notification Center & Templates>

