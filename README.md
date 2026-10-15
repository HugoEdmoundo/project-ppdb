<div align="center">
  <img src="https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png" alt="Ar-Rahman Logo" width="120" />
  <h1>Sistem PPDB dan Company Profile PTDARRAHMAN</h1>
  <p><strong>Company Profile & Portal Terpadu PPDB (Penerimaan Peserta Didik Baru)</strong></p>

  [![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
  [![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Python](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![TypeScript](https://img.shields.io/badge/React_Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://vitejs.dev/)

</div>

---

Selamat datang di monorepo Sistem Terpadu **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**. Repository ini menaungi seluruh ekosistem digital institusi, mulai dari website publik (Company Profile) hingga alur seleksi mandiri santri dan backoffice PPDB.

## 🏗️ Arsitektur Monorepo

Project ini menggunakan arsitektur modular **pnpm workspace** yang diorkestrasi oleh **Turborepo**. Masing-masing aplikasi saling terisolasi namun terhubung melalui API pusat dan jaringan internal Docker.

| Aplikasi | Path | Tech Stack | Fungsi & Fitur Utama |
|----------|------|------------|-----------------------|
| 🎓 **PPDB (Portal Santri & Backoffice)** | [`apps/ppdb`](apps/ppdb/README.md) | React 19, Vite 8 | **Portal Santri:** Form pendaftaran 7 tahap (tanpa jenjang), verifikasi kuesioner kesehatan 10 soal, ujian TIU via Safe Exam Browser (SEB), booking sesi 1:1 Tahfidz & Wawancara, pembayaran QRIS Pakasir v2, skema cicilan tahap 2, tanda tangan LoA digital, dan SKD.<br>**Backoffice:** Manajemen gelombang, verifikasi dokumen, input nilai rubrik, monitoring keuangan, dan arsip dossier ZIP. |
| 🛡️ **Superadmin** | [`apps/superadmin`](apps/superadmin/README.md) | React 19, Vite 8 | Panel manajemen platform: akun staf/admin, matriks role & permission modul (RBAC), log aktivitas (*audit trail*), broadcast notifikasi, dan monitoring bot WhatsApp. |
| 🌐 **Company Profile** | [`apps/companyprofile`](apps/companyprofile/README.md) | Next.js 16, Tailwind v4 | Website publik pesantren, informasi program pendidikan, berita, fasilitas, galeri, hero 3D interaktif Three.js, dan portal login terpusat. |
| ⚙️ **Core API** | [`apps/api`](apps/api/README.md) | FastAPI, MySQL, Redis | Backend REST API monolithic: autentikasi HTTP-only Cookie JWT, payment gateway Pakasir API v2 (QRIS dinamis), webhook Google Apps Script TIU, scheduler cicilan, dan generator berkas resmi. |
| 📱 **WA Gateway** | [`apps/whatsapp`](apps/whatsapp/README.md) | Node.js, BullMQ, Express | Service mandiri berbasis `whatsapp-web.js` & Chromium untuk pengiriman notifikasi otomatis realtime via task queue Redis. |

---

## 🌐 Rute Verifikasi Publik (Tanpa Perlu Login)

Untuk memudahkan verifikasi keabsahan dokumen pendaftar secara langsung via pemindaian QR code fisik/digital:
- 🧾 **Kuitansi Pembayaran Resmi:** `/kuitansi/:id` atau `/receipt/:id` (diberi segel keamanan token HMAC).
- 📜 **Surat Penerimaan Resmi (LoA):** `/loa/:registrationNo` (memverifikasi status kelulusan santri).

---

## 📚 Dokumen Spesifikasi, Panduan & Panduan Agen

- 📑 [**Aturan Bisnis & Requirement (docs/REQUIREMENTS.md)**](docs/REQUIREMENTS.md) — Aturan bisnis periode, kuota atomik, LoA, rubrik penilaian, bebas-jenjang, dan kuesioner kesehatan.
- 🐳 [**Setup Docker Runbook (docs/DOCKER_SETUP.md)**](docs/DOCKER_SETUP.md) — Panduan wajib deployment lokal menggunakan WSL2 dan Docker Engine.
- 🤖 [**Panduan Utama AI Agents (AGENTS.md)**](AGENTS.md) — Tata cara kerja dan aturan coding lintas project.
  - ⚙️ [Panduan Core API Backend](apps/api/AGENTS.md)
  - 🎓 [Panduan Frontend PPDB](apps/ppdb/AGENTS.md)
  - 🛡️ [Panduan Panel Superadmin](apps/superadmin/AGENTS.md)
  - 🌐 [Panduan Company Profile](apps/companyprofile/AGENTS.md)
- 💻 [**Panduan Ujian TIU di SEB (docs/PANDUAN_UJIAN_TIU_SEB.md)**](docs/PANDUAN_UJIAN_TIU_SEB.md) — Panduan instalasi dan penggunaan Safe Exam Browser.
- 🔗 [**Integrasi Webhook TIU Apps Script (docs/INTEGRASI_TIU_APPS_SCRIPT.md)**](docs/INTEGRASI_TIU_APPS_SCRIPT.md) — Skrip Google Apps Script untuk sinkronisasi nilai kuis TIU.
- 🔔 [**Spesifikasi Notifikasi WhatsApp (docs/notifikasi-code-1790904241894.md)**](docs/notifikasi-code-1790904241894.md) — Alur template pesan notifikasi WhatsApp.

---

## 🚀 Memulai (Quick Start)

### Opsi 1: Menjalankan Menggunakan Docker di WSL2 (Sangat Direkomendasikan)

Ikuti runbook lengkap di [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md):

1. Pastikan Anda berada di direktori ext4 WSL (`/home/<user>/project-ppdb`).
2. Siapkan file `.env` di masing-masing aplikasi (`apps/api/.env`, `apps/whatsapp/.env`).
3. Jalankan Docker Compose:

```bash
docker compose up -d --build
```

Setelah berstatus *healthy*, layanan dapat diakses melalui browser:
- `http://<ip-wsl>:3000` — Company Profile
- `http://<ip-wsl>:5173` — Portal PPDB (Calon Santri & Panitia)
- `http://<ip-wsl>:5174` — Panel Superadmin
- `http://<ip-wsl>:8080` — Core API Backend

### Opsi 2: Menjalankan Frontend Workspace secara Lokal (Host Dev)

Jika ingin mengembangkan atau *debugging* UI secara cepat di host:

```bash
# Instal seluruh dependensi monorepo
pnpm install

# Menjalankan seluruh frontend secara serentak via Turborepo
pnpm dev
```

> **Catatan Alokasi Port Dev Lokal:**
> - Company Profile: `http://localhost:3000`
> - Portal PPDB: `http://localhost:5174`
> - Superadmin: `http://localhost:5173`
> - Core API (jika dijalankan lokal non-docker): `http://localhost:8000`

---
<div align="center">
  <i>Dikembangkan dengan 💻 untuk generasi Qur'ani masa depan.</i>
</div>
