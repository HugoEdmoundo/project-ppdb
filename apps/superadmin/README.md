<div align="center">
  <h1>🛡️ Superadmin</h1>
  <p><strong>Panel Manajemen Pengguna, Hak Akses & Operasional Platform</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi frontend berbasis **Vite + React + TypeScript** yang berfungsi sebagai panel administrasi eksklusif untuk **Superadmin** di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

Di panel ini, **Superadmin** mengelola akun pengguna, matriks hak akses/role (RBAC), memantau log aktivitas, serta mengelola koneksi WhatsApp gateway.

## ✨ Fitur Utama

- 📊 **Dashboard:** Statistik total pengguna aktif, distribusi role, dan aktivitas sistem.
- 👥 **Users:** CRUD akun staf/admin, penetapan role, dan izin halaman per user.
- 🛡️ **Roles & Permissions:** Konfigurasi role sistem dan penugasan izin modul (`companyprofile` dan `ppdb`) dengan level akses (`none` < `dashboard` < `read` < `crud`).
- 🎓 **Pendaftar:** Tinjauan daftar seluruh pendaftar PPDB dan kemampuan reset kata sandi akun pendaftar.
- 🕘 **Aktivitas:** Jejak audit (*audit trail*) aktivitas pengguna dan admin.
- 🔔 **Notifikasi:** Melihat riwayat pengiriman notifikasi dan mengirim notifikasi kustom ke nomor tujuan.
- 📱 **WhatsApp Bridge:** Memantau status koneksi bot WhatsApp, scan QR code otorisasi, dan tes koneksi.
- 👤 **Profil:** Memperbarui profil personal superadmin (avatar, nama, dan kata sandi).

> **Catatan:** Operasional PPDB harian (gelombang, verifikasi dokumen, pembayaran formulir/cicilan, penjadwalan sesi 1:1, penilaian evaluator, penerbitan LoA/SKD, dan pencarian arsip dossier) berada di aplikasi [`apps/ppdb`](../ppdb/README.md), bukan di panel Superadmin ini.

## 🛠️ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v3, Radix UI primitives, Lucide React
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) via HTTP-only Cookies (`credentials: 'include'`)

## 📦 Menjalankan secara Lokal

Aplikasi ini masuk ke dalam ekosistem `pnpm workspace`. Buka terminal di root repository:

```bash
# Menjalankan development server
pnpm --filter superadmin dev
```

> **Informasi Port:**
> - Saat dijalankan secara lokal (`pnpm --filter superadmin dev`), Vite dev server default berjalan pada `http://localhost:5173`.
> - Saat dijalankan melalui Docker Compose (preview), container memetakan Superadmin ke port `http://localhost:5174`.

## 📚 Bacaan Lebih Lanjut
- 🤖 [**Panduan Panel Superadmin (AGENTS.md)**](AGENTS.md) — Arsitektur teknis, guarded routes, dan otorisasi cookie.
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) — Aturan bisnis menyeluruh ekosistem PPDB.

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
