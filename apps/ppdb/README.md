<div align="center">
  <h1>🎓 PPDB Frontend</h1>
  <p><strong>Aplikasi Portal Pendaftaran Peserta Didik Baru</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Ini adalah aplikasi frontend berbasis **Vite + React + TypeScript** untuk portal pendaftaran Peserta Didik Baru (PPDB) di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

Aplikasi ini melayani para pendaftar (calon siswa/orang tua) untuk:
- 📝 Melakukan pendaftaran dan mengisi biodata.
- 📁 Mengunggah dokumen persyaratan.
- 🔍 Memantau status verifikasi dan hasil kelulusan.
- 💻 Mendapatkan tiket ujian TIU (terintegrasi Safe Exam Browser).
- 📜 Mengakses LoA dan Surat Keterangan Diterima (SKD).
- 💳 Melihat tagihan dan status pembayaran formulir/cicilan.

## 🛠️ Stack Teknologi

- **Framework:** React 18, Vite
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS
- **State/Data Fetching:** React Query / SWR
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) (FastAPI)

## 📦 Menjalankan secara Lokal

Aplikasi ini merupakan bagian dari pnpm workspace. Buka terminal di root repository dan jalankan:

```bash
# Instalasi dependensi workspace
pnpm install

# Menjalankan development server (port 5173)
pnpm --filter ppdb dev
```

> **Catatan Endpoint API:**
> Secara default, aplikasi memanggil backend API lokal. Jika menggunakan Docker untuk API, pastikan `apps/api` berjalan. Set environment variable `VITE_API_URL` untuk menunjuk ke IP WSL Anda (lihat panduan Docker).

## 📚 Referensi Aturan Bisnis
Bukan di sini tempatnya! Untuk memahami alur pendaftaran, sistem Gelombang dan Periode, atau aturan ujian TIU menggunakan SEB, silakan rujuk ke:
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md)

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
