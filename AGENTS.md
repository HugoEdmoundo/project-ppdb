# Panduan Agent — PPDB Ar-Rahman

## Status Kebutuhan Produk

Sistem PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman menaungi **Konfigurasi Backoffice Panitia** dan **Portal Tahapan Mandiri Calon Santri (Pendaftar)**. Gunakan dokumen spesifikasi terbaru dalam `docs/` sebagai acuan kebutuhan utama. Jangan menerapkan flow lama dari kode arsip atau README lama tanpa konfirmasi.

## Ruang Lingkup Sistem Saat Ini

### 1. Konfigurasi Backoffice Panitia
Admin/Panitia menyiapkan komponen operasional sebelum pendaftaran dibuka:
- **Gelombang**: tanggal buka/tutup, harga formulir, kuota pendaftar, diskon komponen DP3/gedung/SPP, diskon untuk X pendaftar pertama, serta minimal DP.
- **Template dan LoA**: generate dan preview LoA sebelum publish, latar SKD, dan klausul dana tidak dapat dikembalikan (*non-refundable*).
- **Rubrik penilaian**: kriteria, bobot, dan formulir evaluator Tahfidz serta wawancara. Nilai TIU berasal otomatis dari paket pilihan ganda dan webhook; admin tidak menginput nilai TIU manual.
- **Session 1:1 Tahfidz**: penjadwalan, penguji, mode online/offline, tautan Zoom atau lokasi tatap muka.
- **Session 1:1 Wawancara**: penjadwalan, pewawancara, mode online/offline, tautan Zoom atau lokasi tatap muka.
- **Pengaturan TIU global**: URL Pre-filled Google Form (dengan placeholder `{token}`), webhook secret, durasi tes (menit), dan integrasi Apps Script untuk sinkronisasi skor ke aplikasi secara real-time. Pengaturan TIU bersifat global, bukan per gelombang.

### 2. Portal Alur Tahapan Calon Santri (Pendaftar)
Pendaftar melewati tahapan pendaftaran secara berurutan dan terstruktur:
1. **Pendaftaran Akun (7 Bagian):** Pilih Jalur, Identitas Santri, Data Orang Tua/Wali lengkap, Kontak (email & WhatsApp), Domisili, Kuesioner Kesehatan (10 pertanyaan), dan Pernyataan/Persetujuan. Pendaftar otomatis ditautkan ke satu-satunya gelombang aktif.
2. **Pembayaran Biaya Formulir (Pakasir v2):** Pembayaran formulir via QRIS dinamis. Kuota gelombang dan diskon pendaftar awal berkurang saat transaksi berhasil. Setelah lunas, kuitansi resmi terbit.
3. **Unggah Dokumen:** Mengunggah dokumen wajib (NISN, KK, Akte Kelahiran, Pas Foto) serta dokumen tambahan jalur khusus (Sertifikat/Rapor/Bukti Hafalan). Admin memverifikasi dokumen di backoffice.
4. **Ujian TIU (Safe Exam Browser):** Pendaftar jalur TIU mengunduh konfigurasi `.seb` dari dashboard. SEB mengunci layar desktop dan membuka Google Form dengan token pendaftar terisi otomatis. Nilai masuk otomatis via webhook Apps Script (`POST /ppdb/webhook/tiu`).
5. **Booking Sesi 1:1 Tahfidz:** Pendaftar memilih slot jadwal ujian Tahfidz bersama penguji.
6. **Booking Sesi 1:1 Wawancara:** Terbuka otomatis setelah nilai Tahfidz diinput oleh penguji.
7. **Pengumuman Kelulusan & LoA:** Pendaftar yang dinyatakan lulus dapat mengunduh LoA resmi dan membubuhkan tanda tangan digital bersama orang tua/wali (`POST /ppdb/applicants/me/sign-loa`).
8. **Pembayaran Tahap 2 (DP) & Cicilan:** Pendaftar membayar DP biaya masuk via Pakasir v2 QRIS, lalu mengatur skema pembagian cicilan untuk sisa tagihan.
9. **Surat Keterangan Diterima (SKD) & Grup WA:** Setelah DP Tahap 2 lunas, pendaftar mendapatkan SKD resmi dengan nomor registrasi unik serta tautan bergabung ke WhatsApp Group resmi santri baru.

---

## Aturan Periode, Gelombang, dan Arsip

- **Periode Tunggal:** Hanya satu periode yang aktif secara global. Mengaktifkan suatu periode menonaktifkan periode lain beserta gelombang di luarnya; menonaktifkan periode menonaktifkan gelombang di dalamnya.
- **Gelombang Tunggal:** Dalam satu periode hanya boleh ada satu gelombang aktif. Mengaktifkan gelombang lain menggantikan gelombang aktif sebelumnya.
- **Penautan Otomatis:** Karena hanya ada satu periode dan satu gelombang aktif, calon santri otomatis masuk ke gelombang tersebut tanpa memilih sendiri.
- **Kuota Atomik & Penutupan Otomatis:** Kuota dan diskon X pendaftar awal dihitung dari pembayaran formulir yang sukses. Saat kuota tercapai, gelombang dan pendaftaran ditutup otomatis, tagihan pending dibatalkan, dan pengingat Senin dihentikan.
- **Pengecualian Pembayaran Terlambat:** Jika webhook pembayaran sukses tiba setelah invoice dibatalkan karena kuota penuh, tandai transaksi sebagai *exception* untuk pemeriksaan admin—jangan memindahkan pendaftar otomatis ke gelombang lain.
- **Pencarian Dossier & Arsip:**
  - Filter pencarian lintas periode dan gelombang **hanya ada di halaman khusus Arsip/Cari Pendaftar (`/admin/arsip`)**, bukan ditambahkan ke semua tabel operasional.
  - Halaman Arsip menyediakan dossier lengkap: biodata, dokumen asli beserta riwayat verifikasi, hasil TIU, nilai sesi 1:1, keputusan kelulusan, LoA bertanda tangan, riwayat pembayaran & cicilan, serta berkas SKD.
  - Mendukung unduhan per berkas dan unduhan paket ZIP satu-klik. Akses dossier dibatasi dengan izin khusus dan mencatat log audit alamat IP admin.

---

## Integrasi Payment Gateway Pakasir API v2

- Backend menggunakan integrasi resmi Pakasir API v2 (`apps/api/src/core/pakasir.py` & `src/services/payment_service.py`).
- **QRIS Dinamis:** Setiap transaksi formulir atau pembayaran tahap 2 men-generate QRIS dengan batas waktu kedaluwarsa.
- **Webhook Verifikasi 1 Pintu:** Webhook diterima di `POST /payment/webhook` dan `POST /payment/webhook/pak-kasir`, divalidasi dengan header `X-Secret`, pencocokan nominal, dan pencatatan idempoten untuk mencegah duplikasi saldo/kuota.
- **Kuitansi Resmi Publik:** Setiap pembayaran yang terkonfirmasi menerbitkan kuitansi resmi bertanda tangan digital HMAC token (`/kuitansi/:id` atau `/payment/public-receipt/{id}`).
- **Penjadwal Cicilan:** Scheduler latar belakang (`apps/api/src/core/scheduler.py`) mendeteksi jatuh tempo cicilan pendaftar dan mengirimkan notifikasi pengingat via WhatsApp H-3 sebelum tenggat.

---

## Tanpa Pemilihan Jenjang Pendidikan

- Sistem **tidak mengenal daftar jenjang pendidikan** (`SMP`, `SMK`, dll.) dan **tidak menyediakan pemilihan jenjang di mana pun**: formulir registrasi, dashboard pendaftar, konfigurasi gelombang, dan halaman publik semuanya bebas jenjang.
- Pendaftar tidak memilih, tidak mengisi, dan tidak dapat mengubah jenjang.
- Jangan menambah pilihan/field/whitelist jenjang baru di backend maupun UI. Scope gelombang hanya memuat jalur pendaftaran, bukan jenjang.
- Bila jenjang perlu dicantumkan pada dokumen resmi (LoA, SKD, transkrip), perlakukan sebagai atribut tetap institusi dari satu konfigurasi tingkat sekolah, bukan input pengguna.

---

## Formulir Identifikasi Kesehatan (Pengganti Medcheck)

- Diisi sendiri oleh pendaftar saat registrasi awal di `/register`, bukan oleh petugas medis.
- Struktur 10 pertanyaan baku (riwayat penyakit kronis, diagnosis kondisi tertentu, alergi, pengobatan rutin, keterbatasan fisik, riwayat rawat inap 2 tahun terakhir, kebutuhan khusus belajar, nama kontak darurat, hubungan kontak darurat, nomor telepon darurat, dan pernyataan persetujuan).
- Pertanyaan Ya/Tidak membuka kolom keterangan kondisional. Keterangan pada jawaban "Tidak" dikosongkan dan tidak dikirim.
- Validasi kelengkapan dijalankan ulang di backend saat pendaftaran. Data kesehatan bersifat sensitif: hanya dapat dibuka oleh admin pada detail/dossier pendaftar dengan catatan audit.

---

## Rute Publik Tanpa Login
- `/kuitansi/:id` & `/receipt/:id`: Verifikasi keaslian kuitansi pembayaran resmi via QR code.
- `/loa/:registrationNo`: Verifikasi keaslian Surat Penerimaan (LoA) calon santri resmi via QR code.

---

## Acuan Dokumen Repository

- `docs/REQUIREMENTS.md` — Spesifikasi aturan bisnis dan logika utama.
- `docs/DOCKER_SETUP.md` — Runbook deployment lokal WSL2 & Docker yang wajib diikuti langkah per langkah.
- `docs/INTEGRASI_TIU_APPS_SCRIPT.md` — Panduan pemasangan Apps Script Google Form TIU.
- `docs/PANDUAN_UJIAN_TIU_SEB.md` — Panduan instalasi dan penggunaan Safe Exam Browser pendaftar.
- `docs/notifikasi-code-1790904241894.md` — Spesifikasi template dan event notifikasi WhatsApp.
- `apps/api/AGENTS.md` — Panduan arsitektur backend Core API (FastAPI, Alembic, Pakasir v2, Repositories).
- `apps/ppdb/AGENTS.md` — Panduan arsitektur frontend PPDB (8 rute tahapan pendaftar, modal, dan backoffice).
- `apps/superadmin/AGENTS.md` — Panduan arsitektur panel Superadmin.
- `apps/companyprofile/AGENTS.md` — Panduan arsitektur portal Company Profile & auth cookies.

---

## Aturan Kerja & Konvensi
- Pertahankan dynamic branding (logo/favicon diambil dinamis dari API `settingsService.getLogo()`, jangan hardcode path logo statis).
- Simpan kredensial/secret di `.env` lokal masing-masing aplikasi dan jangan pernah commit file secret ke Git.
- Periksa keselarasan port:
  - **Docker Compose:** PPDB `:5173`, Superadmin `:5174`, Company Profile `:3000`, API `:8080`, WhatsApp internal `:3100`.
  - **Local Vite Dev:** PPDB `:5174`, Superadmin `:5173`, Company Profile `:3000`, API `:8000`.
- Jangan commit atau membuat branch baru kecuali diminta oleh user.
