<div align="center">
  <h1>🎓 PPDB Frontend</h1>
  <p><strong>Aplikasi Portal Pendaftaran Peserta Didik Baru & Backoffice PPDB</strong></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

Aplikasi frontend berbasis **Vite + React + TypeScript** untuk sistem Penerimaan Peserta Didik Baru (PPDB) di Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Aplikasi ini menyatukan portal mandiri calon santri/wali murid dengan panel operasional panitia PPDB.

## ✨ Fitur & Layanan Utama

### 👨‍🎓 Portal Calon Santri (Pendaftar)
- 📝 **Registrasi Bertahap:** 7 tahapan form (Pilih Jalur bebas-jenjang, Biodata, Data Orang Tua/Wali, Kontak, Domisili, Kuesioner Kesehatan 10 pertanyaan, dan Persetujuan).
- 💳 **Pembayaran Biaya Formulir:** Terintegrasi QRIS dinamis Pakasir v2 dengan timer otomatis dan penerbitan kuitansi resmi.
- 📁 **Unggah Dokumen:** Pengunggahan berkas wajib (NISN, KK, Akte, Pas Foto) serta berkas khusus per jalur (Prestasi, Tahfidz, Akademik).
- 💻 **Ujian TIU Online (Safe Exam Browser):** Pengunduhan file `.seb` otomatis dengan timer server yang mengunci layar perangkat komputer.
- 📅 **Booking Sesi 1:1:** Pemilihan jadwal mandiri untuk Ujian Tahfidz dan Wawancara bersama penguji.
- 📜 **Kelulusan & Tanda Tangan LoA:** Preview Letter of Acceptance (LoA) resmi dan pembubuhan tanda tangan digital orang tua.
- 💰 **Pembayaran Tahap 2 (DP & Cicilan):** Pembayaran DP via QRIS, simulasi/pengaturan skema cicilan biaya pendidikan, dan pengunggahan bukti pembayaran.
- 🎓 **SKD & Komunitas Resmi:** Penerbitan Surat Keterangan Diterima (SKD) bernomor registrasi resmi dan tautan bergabung ke WhatsApp Group angkatan.

### 🛡️ Backoffice Admin PPDB (`/admin/*`)
- 📊 **Monitoring Pendaftar:** Pelacakan status berkas, verifikasi dokumen, dan kuesioner kesehatan.
- ⏱️ **Manajemen Gelombang & Periode:** Penjadwalan, kuota pembayaran otomatis, dan diskon pendaftar awal.
- 📝 **Pengaturan TIU & Rubrik:** Konfigurasi Pre-filled URL Google Form, durasi ujian, secret webhook Apps Script, dan bobot rubrik.
- 🎙️ **Penjadwalan 1:1:** Manajemen slot penguji Tahfidz dan pewawancara.
- ⚖️ **Penilaian & LoA:** Input skor evaluator, penentuan status kelulusan, dan review LoA pendaftar.
- 🗄️ **Arsip Dossier:** Pencarian data dossier lengkap lintas periode dan gelombang, serta ekspor bundle ZIP satu-klik dengan log audit.

### 🌐 Rute Verifikasi Publik (Tanpa Login)
- 🧾 `/kuitansi/:id` & `/receipt/:id`: Verifikasi keaslian bukti bayar kuitansi resmi.
- 📜 `/loa/:registrationNo`: Verifikasi keaslian surat penerimaan LoA santri.

## 🛠️ Stack Teknologi

- **Framework:** React 19, Vite 8, React Router v7
- **Bahasa:** TypeScript
- **Styling:** Tailwind CSS v3, Radix UI primitives, Lucide React
- **Koneksi API:** Berkomunikasi dengan [`apps/api`](../api/README.md) via HTTP-only Cookies (`credentials: 'include'`)

## 📦 Menjalankan secara Lokal

Buka terminal di root repository:

```bash
# Instalasi dependensi workspace
pnpm install

# Menjalankan development server PPDB
pnpm --filter ppdb dev
```

> **Informasi Port:**
> - Saat dijalankan secara lokal (`pnpm --filter ppdb dev`), Vite dev server default berjalan pada `http://localhost:5174`.
> - Saat dijalankan melalui Docker Compose (produksi/preview), container memetakan PPDB ke port `http://localhost:5173`.
> - Jika menggunakan Docker untuk API backend, pastikan `VITE_API_URL` diarahkan ke `http://localhost:8080` atau IP WSL Anda.

## 📚 Bacaan Lebih Lanjut
- 🤖 [**Panduan Frontend PPDB (AGENTS.md)**](AGENTS.md) — Rincian lengkap 8 rute tahapan pendaftar, rute admin, dan arsitektur komponen.
- 📖 [**Dokumen Requirements Global**](../../docs/REQUIREMENTS.md) — Aturan bisnis periode, kuota, rubrik penilaian, dan formulir kesehatan.
- 💻 [**Panduan Ujian TIU Safe Exam Browser**](../../docs/PANDUAN_UJIAN_TIU_SEB.md) — Panduan pengerjaan ujian SEB pendaftar.

---
⬅️ [Kembali ke Halaman Utama](../../README.md)
