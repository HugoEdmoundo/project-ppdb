<div align="center">
  <h1>🛡️ Superadmin</h1>
  <p><strong>Panel Manajemen Pengguna & Operasional Platform</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Ini adalah aplikasi frontend berbasis **Vite + React + TypeScript** yang berfungsi sebagai panel administrasi eksklusif untuk **Superadmin** di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

Di sinilah **Superadmin** mengelola pengguna, hak akses, dan operasional platform.

## ✨ Fitur Utama

- 📊 **Dashboard:** Ringkasan statistik pengguna dan role.
- 🎓 **Pendaftar:** Daftar pendaftar PPDB dan reset kata sandi.
- 👥 **Users:** CRUD pengguna beserta penetapan role.
- 🛡️ **Roles & Permissions:** CRUD role dan penugasan izin modul/halaman (`companyprofile` dan `ppdb`).
- 🕘 **Aktivitas:** Riwayat aktivitas pengguna.
- 🔔 **Notifikasi:** Melihat log notifikasi dan mengirim notifikasi kustom.
- 📱 **WhatsApp:** Status koneksi bot WhatsApp dan pemindaian QR.
- 👤 **Profil:** Memperbarui profil superadmin (avatar, kata sandi).

> **Catatan:** Konfigurasi operasional PPDB (gelombang/periode, verifikasi dokumen, pembayaran, sesi 1:1, penilaian, LoA/SKD, pengaturan TIU, arsip dossier) berada di aplikasi [`apps/ppdb`](../ppdb/README.md), bukan di panel Superadmin ini.

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
