<div align="center">
  <h1>🛡️ Superadmin & Backoffice</h1>
  <p><strong>Panel Pengendali Utama Sistem PPDB</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Ini adalah aplikasi frontend berbasis **Vite + React + TypeScript** yang berfungsi sebagai panel administrasi eksklusif (Backoffice) untuk Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

Di sinilah **Admin, Evaluator, dan Panitia** mengendalikan seluruh sistem.

## ✨ Fitur Utama Backoffice

Sesuai dengan aturan bisnis yang termodularisasi, backoffice ini berfokus pada kontrol:
- 📅 **Manajemen Gelombang & Periode:** Aktivasi periode global, penetapan harga pendaftaran, pengaturan kuota, dan diskon.
- 📄 **Master Data:** Konfigurasi template Surat Kelulusan (LoA), klausul _non-refundable_, dan format Surat Keterangan Diterima (SKD).
- 🧠 **Pengaturan Ujian TIU:** Pengaturan webhook secret, batasan durasi, integrasi Google Form, dan halaman sinkronisasi otomatis.
- 🗣️ **Sesi Wawancara & Tahfidz:** Penjadwalan ujian, alokasi penguji, mode ujian (online/offline), dan rubrik penilaian.
- 🗂️ **Arsip Dossier:** Halaman khusus lintas periode untuk menelusuri data lengkap peserta didik serta mengekspor PDF/ZIP dokumen mereka.

## 🛠️ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS
- **Koneksi API:** Berkomunikasi intensif dengan [`apps/api`](../api/README.md) (FastAPI)

## 📦 Menjalankan secara Lokal

Aplikasi ini masuk ke dalam ekosistem `pnpm workspace`. Buka terminal di root repository dan jalankan:

```bash
# Menjalankan development server (port 5174)
pnpm --filter superadmin dev
```

## 📚 Referensi Aturan Bisnis
Untuk penjelasan mendalam tentang logika *locking* kuota, pembatalan *invoice*, atau manajemen attempt SEB, baca:
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md)

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
