# Panduan Agent — PPDB Ar-Rahman

## Status Kebutuhan Produk

Sistem PPDB lama sudah tidak menjadi acuan kebutuhan. Untuk pekerjaan produk, gunakan dokumen terbaru dalam `docs/`. Fokus pengerjaan yang disepakati saat ini adalah **konfigurasi/backoffice**. Jangan menerapkan flow lama dari kode, README lama, atau dokumen arsip sebagai aturan bisnis baru tanpa konfirmasi.

## Ruang Lingkup Backoffice Saat Ini

Admin menyiapkan konfigurasi dari dashboard sebelum pendaftaran dibuka:

1. **Gelombang**: tanggal buka/tutup, harga formulir, kuota pendaftar, diskon komponen DP3/gedung/SPP, diskon untuk X pendaftar pertama, serta minimal DP.
2. **Template dan LoA**: generate dan preview LoA sebelum publish, latar SKD, dan klausul dana tidak dapat dikembalikan. Dokumen baru menyebut klausul ini hardcoded.
3. **Rubrik penilaian**: kriteria, bobot, dan formulir evaluator Tahfidz serta wawancara. Nilai TIU berasal otomatis dari paket pilihan ganda dan webhook; admin tidak menginput nilai TIU.
4. **Sesi Tahfidz**: jadwal, penguji, mode online/offline, tautan Zoom atau lokasi.
5. **Sesi wawancara**: jadwal, pewawancara, mode online/offline, tautan Zoom atau lokasi.
6. **Pengaturan TIU global**: URL Google Form sumber soal, webhook secret, durasi tes, dan integrasi Apps Script untuk sinkronisasi soal ke aplikasi. Integrasi tidak disetel per gelombang.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran gelombang sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran. Dokumen alur pendaftar dan admin memuat tahap lanjutan, tetapi jangan memperluas pekerjaan backoffice ke tahap tersebut tanpa arahan.

### Aturan Periode, Gelombang, dan Arsip

- Hanya satu periode yang aktif secara global. Mengaktifkan periode menonaktifkan periode lain dan gelombang di luar periode tersebut; menonaktifkan periode menonaktifkan gelombang di dalamnya.
- Gelombang hanya boleh aktif jika periode induknya aktif.
- Tidak ada satu gelombang aktif global yang dipakai untuk membatasi data yang bisa dicari.
- Dalam satu periode hanya boleh ada satu gelombang aktif. Mengaktifkan gelombang lain dalam periode yang sama menggantikan gelombang aktif sebelumnya. Gelombang hanya aktif jika periode induknya aktif.
- Karena hanya ada satu periode aktif dan satu gelombang aktif pada periode itu, pendaftar otomatis ditautkan ke gelombang aktif periode tersebut; pendaftar tidak memilih gelombang sendiri.
- Kuota dan diskon untuk X pendaftar awal dihitung dari pembayaran formulir yang berhasil. Saat kuota tercapai, tutup pendaftaran dan gelombang secara otomatis.
- Saat kuota tercapai, batalkan tagihan formulir yang belum dibayar dan beri tahu pendaftar bahwa mereka boleh mendaftar lagi di gelombang berikutnya. Sebelum kuota tercapai, kirim pengingat pembayaran setiap hari Senin kepada pendaftar yang belum membayar; hentikan saat gelombang ditutup.
- Filter periode/gelombang untuk pencarian lintas periode hanya ada di **halaman khusus Arsip/Cari Pendaftar**, bukan ditambahkan ke semua halaman atau filter.
- Halaman Arsip/Cari Pendaftar harus menampilkan dossier lengkap pendaftar dalam satu tindakan: biodata, dokumen yang pernah diunggah, riwayat verifikasi, hasil TIU, sesi dan nilai Tahfidz/wawancara, keputusan, LoA, pembayaran dan cicilan, serta berkas keluaran seperti SKD jika sudah ada. Sediakan unduhan yang rapi dan terstruktur.
- Dossier harus tetap bisa dicari lintas periode dan gelombang tanpa mengubah periode/gelombang aktif operasional; mendukung unduhan per berkas dan ZIP dossier.
- Data pendaftar dan seluruh data turunannya wajib dapat ditelusuri ke periode dan gelombang yang menaungi pendaftar: pendaftaran, dokumen/verifikasi, pembayaran/tagihan/cicilan, sesi dan nilai TIU/Tahfidz/wawancara, keputusan, LoA, serta SKD/nomor registrasi. Gunakan relasi ke pendaftar sebagai sumber periode/gelombang; jangan menduplikasi ID tanpa kebutuhan query yang jelas.
- Halaman arsip adalah tempat khusus untuk pencarian lintas periode/gelombang, dossier lengkap, dan ekspor. Halaman operasional lain tidak mendapat filter arsip global.
- Halaman arsip mendukung unduhan per berkas dan unduhan dossier lengkap dalam satu ZIP berisi ringkasan PDF serta dokumen asli yang dikelompokkan rapi. Terapkan izin akses khusus karena dossier mencakup dokumen pribadi dan data pembayaran.
- Rekomendasi histori: konfigurasi gelombang (waktu, biaya, kuota, diskon, minimal DP) tersimpan per gelombang; jadwal dan rubrik yang dipakai suatu pendaftar harus dapat direkonstruksi, melalui scope gelombang atau snapshot/versi. Template dasar institusi dapat dipakai ulang, tetapi hasil LoA/SKD yang sudah dibuat harus disimpan sebagai artefak tetap.
- Jumlah gelombang per periode fleksibel/tidak memiliki batas tetap; satu periode hanya boleh memiliki satu gelombang aktif.
- TIU menggunakan metode Pre-filled Google Form yang dibungkus Safe Exam Browser (SEB). Pengaturan URL Google Form (beserta `{token}`), webhook secret, dan durasi bersifat global.
- Setiap pendaftar men-download file `.seb` khusus dari dashboard yang berisi StartURL menuju Google Form dengan kode identitas/token mereka sudah terisi (pre-filled). Timer ujian dicatat di sisi server backend saat file `.seb` di-generate.
- Nilai TIU dikirim otomatis dari Google Form via Apps Script Webhook. Backend memvalidasi token dan durasi pengiriman (waktu submit harus lebih kecil dari waktu mulai + durasi ujian). Setelah berhasil disimpan, picu notifikasi WhatsApp hasil TIU ke pendaftar.
- Validasi/pengecualian wajib: cegah pendaftaran tanpa periode aktif, gelombang aktif, dalam tanggal, dan kuota tersedia; template LoA bukan prasyarat pendaftaran. Validasi ulang di server saat pendaftaran/pembayaran; proses webhook idempoten dan hitungan kuota atomik; setelah kuota penuh tutup gelombang, batalkan invoice pending, hentikan pengingat Senin, dan tandai pembayaran terlambat sebagai pengecualian admin (jangan pindahkan pendaftar otomatis).
- Pertanyaan terbuka: penanganan pembayaran ganda/terlambat dan izin melihat/mengunduh dossier lengkap.

### Tanpa Pemilihan Jenjang Pendidikan

- Sistem **tidak mengenal daftar jenjang pendidikan** (`SMP`, `SMK`, atau nilai lain) dan **tidak menyediakan pemilihan jenjang di mana pun**: formulir pendaftaran, dashboard pendaftar, konfigurasi gelombang, dan halaman publik semuanya bebas jenjang. Pendaftar tidak memilih, tidak mengisi, dan tidak dapat mengubah jenjang.
- Jangan menambah pilihan/field/whitelist jenjang baru di backend maupun UI. Wave scope hanya memuat jalur pendaftaran, bukan jenjang.
- Bila jenjang masih perlu dicantumkan pada dokumen (LoA, SKD, transkrip), perlakukan sebagai atribut tetap institusi dari satu konfigurasi tingkat sekolah, bukan input pengguna. Butuh keputusan sebelum menambah setting baru.
- Implementasi lama yang masih menyimpan field/kolom jenjang (misalnya whitelist `ALLOWED_LEVELS`, kolom scope gelombang, atau field jenjang pada pendaftar) adalah sisa flow lama. Perlakukan sebagai artefak tidak aktif: jangan jadikan sumber kebenaran dan jangan tambah UI/endpoint baru yang bergantung padanya. Penghapusan kolom perlu keputusan tersendiri.

### Formulir Identifikasi Kesehatan

- Formulir ini **menggantikan Medcheck**. Diisi sendiri oleh pendaftar pada formulir pendaftaran, bukan oleh petugas medis, dan disimpan sebagai data profil kesehatan pendaftar yang dapat dibuka admin pada detail/dossier pendaftar.
- Rincian lengkap pertanyaan, urutan, dan caption ada di `docs/REQUIREMENTS.md` bagian "Formulir Identifikasi Kesehatan". Ringkasnya: (1) riwayat penyakit kronis, (2) kondisi yang pernah didiagnosis — checkbox Asma/Diabetes/Epilepsi/Penyakit jantung/Hipertensi/TBC/Lainnya, (3) alergi — checkbox Makanan/Obat/Debu/Lainnya, (4) pengobatan rutin, (5) keterbatasan fisik, (6) rawat inap atau operasi 2 tahun terakhir, (7) kebutuhan khusus terkait kesehatan saat belajar, (8) nama kontak darurat, (9) hubungan kontak darurat dengan calon peserta didik, (10) nomor telepon darurat, lalu Pernyataan yang wajib disetujui pendaftar.
- Setiap pertanyaan Ya/Tidak membuka turunannya secara kondisional; keterangan pada jawaban "Tidak" dikosongkan dan tidak dikirim. Pertanyaan 2 dan 3 berupa daftar checkbox, tidak memaksa minimal satu centang.
- Pernyataan harus dikonfirmasi pendaftar sebelum formulir dikirim, dan seluruh aturan kelengkapan harus divalidasi ulang di server saat pendaftaran.
- Data kesehatan bersifat sensitif: batasi akses dengan izin khusus, sertakan dalam jejak audit, dan sudah tercakup dalam dossier/unduhan ZIP pada halaman Arsip/Cari Pendaftar.
- Pertanyaan terbuka: apakah boleh diperbarui setelah pendaftaran, apakah semua pertanyaan wajib dijawab, siapa saja yang boleh membaca, dan berapa lama data disimpan. Jangan implementasi jawaban atas pertanyaan terbuka ini tanpa keputusan.

## Acuan Dokumen

- `docs/REQUIREMENTS.md` — aturan bisnis utama (dokumen acuan untuk perubahan produk).
- `docs/backoffice-code-1790813618837.txt` — daftar konfigurasi backoffice.
- `docs/admin-code-1790812960259.txt` — alur operasional admin lanjutan.
- `docs/pendaftar-code-1790812852070.txt` — alur pendaftar.
- `docs/gemini-code-1790824113350.txt` — contoh formulir penilaian wawancara.
- `README.md` — ringkasan fokus dan keputusan terbuka.

## Konteks Repository

Monorepo menggunakan pnpm workspace dan Turborepo. Aplikasi utama berada di `apps/companyprofile/` (Next.js), `apps/ppdb/` dan `apps/superadmin/` (Vite/React), `apps/api/` (FastAPI), serta `apps/whatsapp/` (Node.js standalone, di luar pnpm workspace). Pahami implementasi yang ada sebelum mengubahnya; implementasi saat ini bisa mencerminkan kebutuhan lama.

## Environment dan Operasi

- Simpan konfigurasi lokal di file `.env` aplikasi terkait dan jangan pernah memasukkan secret ke Git.
- Untuk setup Docker lokal, ikuti runbook `docs/DOCKER_SETUP.md` secara verbatim. Runtime Docker owner berada di WSL2; repo Windows adalah sumber edit dan repo ext4 WSL adalah sumber build/run. Setelah perubahan, sinkronkan file ke repo WSL sebelum build.
- Pertahankan pengaturan DNS Docker, kebijakan Redis, konfigurasi Chromium WhatsApp, dan session WhatsApp yang dijelaskan runbook kecuali tugas secara khusus meminta perubahan terkait.
- Logo dan favicon frontend PPDB/Superadmin harus diambil dinamis melalui API settings, bukan dari aset brand statis.

## Cara Kerja

- Periksa panduan `AGENTS.md` yang lebih dalam sebelum menyentuh subdirektori terkait.
- Ikuti pola dan struktur kode terdekat; buat perubahan sekecil mungkin untuk memenuhi kebutuhan yang telah dikonfirmasi.
- Jangan mengubah flow produk berdasarkan asumsi. Jika dokumen kebutuhan tidak menentukan perilaku yang dibutuhkan, catat pertanyaan dan minta keputusan sebelum mengimplementasikannya.
- Jangan commit atau membuat branch kecuali diminta.
