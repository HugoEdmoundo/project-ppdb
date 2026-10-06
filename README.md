<div align="center">
  <img src="https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png" alt="Ar-Rahman Logo" width="120" />
  <h1>Sistem PPDB dan Company Profile PTDARRAHMAN</h1>
  <p><strong>Company Profile & Portal PPDB (Penerimaan Peserta Didik Baru)</strong></p>

  [![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
  [![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Python](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![TypeScript](https://img.shields.io/badge/React_Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://vitejs.dev/)

</div>

---

Selamat datang di monorepo Sistem Terpadu **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**. Repository ini menaungi seluruh layanan dari halaman depan (Company Profile) hingga Backoffice PPDB.

## 🏗️ Arsitektur Monorepo

Project ini menggunakan arsitektur modular **pnpm workspace** yang diatur oleh **Turborepo**. Masing-masing aplikasi saling terisolasi namun dapat berkomunikasi melalui jaringan internal Docker.

Klik pada masing-masing aplikasi untuk melihat detail teknisnya:

| Aplikasi | Path | Tech Stack | Fungsi Utama |
|----------|------|------------|--------------|
| 🎓 **PPDB Pendaftar** | [`apps/ppdb`](apps/ppdb/README.md) | React, Vite | Portal bagi calon siswa untuk mendaftar, upload berkas, dan ujian TIU. |
| 🛡️ **Superadmin** | [`apps/superadmin`](apps/superadmin/README.md) | React, Vite | Backoffice bagi admin untuk mengatur gelombang, verifikasi, dan arsip pendaftar. |
| 🌐 **Company Profile** | [`apps/companyprofile`](apps/companyprofile/README.md) | Next.js, Tailwind | Website publik pesantren dan pusat informasi. |
| ⚙️ **Core API** | [`apps/api`](apps/api/README.md) | FastAPI, MySQL | Backend utama yang memproses seluruh logika sistem dan sinkronisasi ujian. |
| 📱 **WA Gateway** | [`apps/whatsapp`](apps/whatsapp/README.md) | Node.js, BullMQ | Service mandiri untuk notifikasi realtime via bot WhatsApp. |

---

## 📚 Dokumen Spesifikasi & Bisnis

Kami memisahkan aturan bisnis dari dokumen teknis agar lebih rapi (modular). Untuk mempelajari bagaimana alur pendaftaran, sistem gelombang, dan aturan ujian berjalan, silakan baca:

- 📑 [**Aturan Bisnis & Requirement (REQUIREMENTS.md)**](docs/REQUIREMENTS.md) — Baca ini untuk memahami konsep Periode, Kuota, LoA, aturan penilaian, aturan tanpa jenjang pendidikan, dan Formulir Identifikasi Kesehatan (pengganti Medcheck).
- 🐳 [**Setup Docker (DOCKER_SETUP.md)**](docs/DOCKER_SETUP.md) — Panduan wajib untuk deployment lokal menggunakan WSL2 dan Docker.
- 🤖 [**Panduan AI Agents (AGENTS.md)**](AGENTS.md) — Tata cara kerja dan aturan *coding* untuk AI/Developer.

---

## 🚀 Memulai (Quick Start)

Cara paling direkomendasikan untuk menjalankan seluruh *stack* ini adalah menggunakan **Docker** di dalam environment **WSL2 Windows**.

1. Pastikan Anda berada di direktori WSL ext4 (`/home/user/project-ppdb`).
2. Persiapkan file `.env` di masing-masing aplikasi (lihat instruksi di `docs/DOCKER_SETUP.md`).
3. Jalankan perintah berikut:

```bash
# Menyalakan seluruh service (API, Frontend, Redis, WhatsApp)
docker compose up -d --build
```

Setelah berstatus *healthy*, aplikasi dapat diakses melalui browser host Windows Anda:
- `http://<ip-wsl>:3000` (Company Profile)
- `http://<ip-wsl>:5173` (Portal Pendaftar PPDB)
- `http://<ip-wsl>:5174` (Superadmin Backoffice)
- `http://<ip-wsl>:8080` (Core API)

---
<div align="center">
  <i>Dikembangkan dengan 💻 untuk generasi Qur'ani masa depan.</i>
</div>
