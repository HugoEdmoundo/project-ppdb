<div align="center">
  <h1>⚙️ Core API Backend</h1>
  <p><strong>Mesin Utama Penggerak Sistem Terpadu</strong></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

---

Aplikasi ini adalah **backend utama** untuk seluruh ekosistem Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Menangani transaksi untuk Company Profile, PPDB, dan Superadmin.

## 🚀 Peran & Tanggung Jawab (Fitur Inti)

- 🔐 **Otorisasi Terpusat:** Sistem RBAC (Role-Based Access Control) yang ketat untuk Pendaftar, Admin, Penguji, dan Superadmin.
- 🚦 **Transaksi PPDB (Atomik):** Mengatur validasi periode, pengecekan kuota *race-condition*, dan pembatalan otomatis tagihan (_invoice_) saat kuota terpenuhi.
- 📝 **Integrasi Ujian TIU (SEB):**
  - Membuat tiket *attempt* unik sekali pakai.
  - Memvalidasi parameter Safe Exam Browser (SEB) untuk mencegah kecurangan.
  - Autosave nilai dan pemulihan sesi ujian.
  - Menerima nilai real-time melalui webhook Google Apps Script.
- 📡 **Message Broker:** Memicu *event* Redis (seperti kelulusan TIU, notifikasi kuota habis, pengingat hari Senin) yang akan dieksekusi oleh service `apps/whatsapp`.

## 📦 Menjalankan secara Lokal (Non-Docker)

Sangat disarankan menjalankan API ini menggunakan Docker. Namun, untuk sekadar *local debugging*:

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # (.venv\Scripts\activate untuk Windows)

pip install -r requirements.txt

# Menjalankan uvicorn server (port 8000/8080)
uvicorn main:app --reload
```
*(Jangan lupa menyesuaikan file `.env` ke host database Anda).*

## 🐳 Deployment (Sangat Disarankan)

Kami merekomendasikan Docker WSL2 dengan dukungan mode NAT untuk *name resolution* yang andal.

```bash
# Dari root directory
docker compose up -d --build api
```

## 📚 Bacaan Lebih Lanjut
Untuk memahami cara API ini merespons webhook dan mengelola sistem *locking* gelombang:
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md)
- 🐳 [**Panduan Docker Setup**](../../docs/DOCKER_SETUP.md)

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
