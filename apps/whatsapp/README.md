<div align="center">
  <h1>📱 WA Gateway Microservice</h1>
  <p><strong>Bot Notifikasi Otomatis Terintegrasi</strong></p>

  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)
  [![Redis](https://img.shields.io/badge/BullMQ_Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

---

Service ini adalah aplikasi _standalone_ Node.js yang bertugas secara eksklusif sebagai bot WhatsApp. Aplikasi ini berada **di luar struktur pnpm workspace** karena membutuhkan _environment_ Chromium khusus dan dikemas sebagai kontainer mandiri dalam ekosistem.

## 🚀 Fitur & Kemampuan

Aplikasi ini mendengarkan instruksi *queue* dari backend (`apps/api`) via **BullMQ** (Redis) dan melakukan *broadcast* pesan massal tanpa terkena _rate-limit_:
- ⏰ **Pengingat Berkala:** Mem-blasting peringatan tagihan tertunda setiap hari Senin.
- 🛑 **Alert Kuota:** Mengirim notifikasi pembatalan invoice jika kuota gelombang tiba-tiba habis.
- 🎓 **Hasil Realtime:** Mengirim status kelulusan TIU sesaat setelah skor masuk ke backend.
- 🎫 **Distribusi Tiket:** Menyampaikan panduan dan tiket instalasi Safe Exam Browser (SEB).

## 📦 Menjalankan secara Lokal

Service ini menuntut instalasi OS-level `Chromium` agar simulasi WA Web (`whatsapp-web.js`) dapat berjalan. Sangat direkomendasikan untuk menjalankannya via Docker! (baca [**DOCKER_SETUP.md**](../../docs/DOCKER_SETUP.md)).

Namun, jika ingin dijalankan secara lokal/stand-alone:

```bash
cd apps/whatsapp

# 1. Pastikan Chromium/Google Chrome terinstal di OS Anda
cp .env.example .env
# 2. Set CHROMIUM_EXECUTABLE_PATH di .env ke path instalasi Chrome Anda

# 3. Gunakan NPM (bukan pnpm)
npm install

# 4. Jalankan bot
npm run dev
```

> **🔥 Troubleshooting Docker:**
> Jika WA Service mengalami crash (_stale lock file_) di dalam kontainer Docker akibat dipaksa berhenti (_OOM/kill_), Anda harus menghapus file `SingletonLock` di *volume* `wa_session`. Penjelasan selengkapnya ada di dokumen Docker Setup.

## 📚 Bacaan Lebih Lanjut
Untuk rujukan *template* redaksi pesan (copywriting) WhatsApp:
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md)

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
