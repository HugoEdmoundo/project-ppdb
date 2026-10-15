# Core API Backend — PTDARRAHMAN

Dokumen ini memberikan panduan arsitektur, konvensi kode, modul, dan aturan bisnis backend Core API untuk agen AI dan developer.

---

## 🛠️ Tech Stack & Ekosistem
- **Framework:** FastAPI (Python 3.12)
- **Database ORM:** SQLAlchemy 2.0 (Declarative Base, MySQL via `pymysql`)
- **Migrasi Database:** Alembic (`alembic upgrade head`)
- **Data Validation & Settings:** Pydantic v2 & `pydantic-settings`
- **Cache & Message Broker:** Redis (`redis-py` / `aioredis` untuk task queue notifikasi WhatsApp)
- **HTTP Client:** `httpx` (komunikasi dengan Pakasir v2, WhatsApp bridge, dll.)
- **Testing:** `pytest` dengan fixture database transaksi rollback (`tests/conftest.py`)

---

## 🏛️ Arsitektur Aplikasi (Layered Pattern)

Backend menggunakan pola berlapis (*Separation of Concerns*):

```
apps/api/src/
├── main.py                     # Entrypoint FastAPI, CORS, lifespans, router mounting
├── core/                       # Infrastruktur & konfigurasi global
│   ├── config.py               # Pydantic Settings (env variables)
│   ├── database.py             # SQLAlchemy engine, get_db, Base, audit_log
│   ├── dependencies.py         # Auth guards, token decoding, RBAC checks
│   ├── pakasir.py              # Official client integration Pakasir API v2
│   ├── rate_limit.py           # In-memory / Redis rate limiting
│   ├── scheduler.py            # Background scheduler (pengingat cicilan, expired wave)
│   ├── security.py             # Password hashing (bcrypt) & JWT token encoding/cookies
│   └── uploads.py              # File upload handling (local disk & Cloudinary)
├── models/                     # Definisi SQLAlchemy ORM Models
│   ├── auth.py                 # User, Role, UserModulePermission, UserPagePermission
│   ├── ppdb.py                 # PPDBPeriod, PPDBWave, PPDBApplicant, PPDBPaymentTransaction, PPDBTIUAttempt, PPDBStage2Bill
│   ├── selection.py            # SelectionCategory, SelectionCriteria, SelectionSession, SelectionScore
│   ├── content.py              # SiteSetting, News, Programs, Facilities, dll.
│   └── notification.py         # NotificationLog, NotificationTemplate
├── repositories/               # Data Access Object (Query DB mentah & filtering)
│   ├── ppdb_repository.py
│   ├── payment_repository.py
│   ├── selection_repository.py
│   └── user_repository.py
├── services/                   # Business Logic Layer (validasi bisnis, kalkulasi finansial)
│   ├── ppdb_service.py
│   ├── payment_service.py
│   ├── selection_service.py
│   ├── auth_service.py
│   └── user_service.py
└── modules/                    # API Routers & Pydantic Schemas
    ├── auth/                   # POST /companyprofile/auth/login, /me, /refresh, /logout
    ├── ppdb/                   # CRUD gelombang, periode, pendaftaran, dokumen, LoA, SKD, arsip dossier
    ├── payment/                # Pakasir v2 QRIS, webhook, tagihan cicilan tahap 2, kuitansi resmi
    ├── selection/              # SEB TIU attempt, sesi 1:1 Tahfidz & Wawancara, penilaian evaluator
    ├── superadmin/             # Stats dashboard, audit trail, user & role management
    ├── companyprofile/         # Public CMS & admin CRUD (news, programs, settings)
    └── whatsapp/               # Status koneksi & QR code bridge WA service
```

---

## 🔐 Autentikasi & Otorisasi

1. **Cookie-Based Auth:**
   - Token JWT (`access_token` dan `refresh_token`) dikirimkan melalui **HTTP-Only Secure Cookies** dengan atribut `SameSite=Lax` (atau `None` jika cross-domain HTTPS).
   - Request dari browser menyertakan cookie otomatis (`credentials: 'include'`).
   - Endpoint `/companyprofile/auth/refresh` menyegarkan cookie token tanpa login ulang.
2. **Role-Based Access Control (RBAC):**
   - Diperiksa melalui dependency di `src/core/dependencies.py`:
     - `get_current_user`: Memvalidasi user aktif dari cookie.
     - `require_module_access(module, access_level)`: Memastikan izin modul (`none` < `dashboard` < `read` < `crud`).
     - `require_ppdb_admin`: Memastikan akses manajemen PPDB level CRUD.
     - `require_ppdb_read`: Memastikan akses pembacaan data PPDB level READ.

---

## 💳 Modul Pembayaran & Integrasi Pakasir v2

- **Client Pakasir (`src/core/pakasir.py`):**
  - Menggunakan spesifikasi Pakasir API v2.
  - Normalisasi respons flat JSON (`status`, `data`, `order_id`, `amount`, `payment_method`).
- **Endpoint Utama (`src/modules/payment/router.py`):**
  - `POST /payment/create-qris`: Membuat invoice dinamis QRIS untuk biaya formulir atau pembayaran DP/cicilan.
  - `POST /payment/webhook` & `POST /payment/webhook/pak-kasir`: Webhook pembayaran atomik & idempoten. Divalidasi dengan header `X-Secret` dan pencocokan nominal.
  - `GET /payment/receipt/{id}` & `GET /payment/public-receipt/{id}`: Menampilkan data kuitansi resmi yang diamankan dengan HMAC token.
  - `POST /payment/stage2/my-installment-plan`: Pengaturan skema cicilan pembayaran tahap 2 oleh pendaftar yang lulus.
- **Background Scheduler (`src/core/scheduler.py`):**
  - Menjalankan cron internal untuk pengingat jatuh tempo cicilan pendaftar (H-3) via antrean Redis ke WhatsApp bot.

---

## 🎯 Modul Seleksi & TIU (Safe Exam Browser)

- **SEB Attempt Generator (`GET /selection/applicants/me/tiu-seb`):**
  - Membuat token attempt unik sekali pakai, mengunci layar pendaftar via file `.seb`, dan memulai timer server.
  - Pre-filled Google Form URL otomatis disisipkan dengan placeholder `{token}`.
- **Webhook Hasil TIU (`POST /ppdb/webhook/tiu`):**
  - Menerima kiriman nilai kuis otomatis dari trigger `onSubmit` Google Apps Script.
  - Validasi ketat: header `X-TIU-Secret`, keberadaan token attempt, dan batas waktu durasi (`submit <= start + duration + 5 menit toleransi`).
  - Penyimpanan nilai berskala idempoten dan langsung memicu event notifikasi hasil TIU.

---

## 📜 LoA, SKD, dan Arsip Dossier

- **Letter of Acceptance (LoA):**
  - Admin menerbitkan LoA untuk pendaftar yang lulus (`/ppdb/pengumuman`).
  - Pendaftar dapat menandatangani LoA digital bersama orang tua (`POST /ppdb/applicants/me/sign-loa`).
  - Verifikasi publik dapat diakses via `/ppdb/loa/{registration_or_id}`.
- **Surat Keterangan Diterima (SKD):**
  - Diterbitkan otomatis setelah DP Tahap 2 dinyatakan lunas (`GET /ppdb/applicants/me/skd`).
- **Arsip & Dossier Pendaftar:**
  - Lintas periode & gelombang hanya dapat diakses melalui `GET /ppdb/archive/applicants`.
  - Detail dossier lengkap: `GET /ppdb/archive/applicants/{id}/dossier`.
  - Ekspor berkas ZIP: `GET /ppdb/archive/applicants/{id}/dossier/zip` (mencatat IP admin pemohon ke dalam `audit_log`).

---

## ⚠️ Aturan Bisnis Wajib (Non-Negotiable)

1. **Tanpa Jenjang Pendidikan:**
   - Tidak ada model/field jenjang (`SMP`, `SMK`). Jangan menambahkan parameter atau validasi jenjang pada endpoint pendaftaran, gelombang, maupun laporan.
2. **Kuesioner Kesehatan (10 Pertanyaan):**
   - Validasi ketat pada saat pendaftaran di `src/modules/ppdb/router.py`: pertanyaan Ya/Tidak harus menyertakan keterangan jika "Ya", kontak darurat harus lengkap, dan pernyataan wajib disetujui (`True`).
3. **Periode & Gelombang Tunggal:**
   - Hanya boleh ada 1 periode aktif secara global, dan maksimal 1 gelombang aktif per periode.
   - Pendaftar otomatis ditautkan ke gelombang aktif saat ini; pendaftar tidak memilih gelombang.

---

## 🚀 Perintah Pengembangan & Testing

```bash
# Masuk ke direktori backend
cd apps/api

# Aktifkan virtual environment
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Jalankan migrasi database
alembic upgrade head

# Jalankan server FastAPI lokal (port 8000)
uvicorn src.main:app --reload --port 8000

# Jalankan unit & integration tests
pytest
```
