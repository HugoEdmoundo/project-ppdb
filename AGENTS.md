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
- TIU dikerjakan di aplikasi PPDB, bukan di Google Form. Pengaturan URL Form, webhook secret, dan durasi bersifat global, bukan per gelombang. Google Form adalah sumber soal dan seluruh soal TIU berupa pilihan ganda dengan satu jawaban benar. Setiap Apps Script sync memasukkan soal, urutan, opsi, dan kunci langsung tanpa review/publish manual. Tampilkan status/waktu sinkronisasi. Jika sync gagal/soal tidak valid, pertahankan paket valid terakhir dan jelaskan kesalahannya.
- Setiap pendaftar hanya mendapat satu attempt TIU, tanpa retake. Tombol Mulai menyiapkan attempt pending; timer server baru berjalan setelah tiket peluncuran sekali pakai ditukar dan SEB tervalidasi. Simpan otomatis jawaban ke server selama attempt agar dapat dipulihkan bila koneksi putus. Saat waktu habis, jawaban tersimpan dikumpulkan dan nilai masuk real-time lewat webhook Apps Script tanpa input manual admin. Backend validasi applicant/attempt ID, simpan hasil idempoten, dan kaitkan nilai ke pendaftar.
- Nilai TIU tersedia otomatis tanpa input manual admin. Apps Script mengirim nilai ke backend lewat webhook secara real-time; event membawa applicant ID/attempt ID dan backend mengambil relasi periode/gelombang dari pendaftar. Setelah berhasil disimpan, picu notifikasi WhatsApp hasil TIU.
- Setelah nilai TIU tersedia, Apps Script mengirim hasil ke backend melalui webhook secara real-time. Backend memvalidasi applicant/attempt ID, menyimpan hasil secara idempoten, dan memicu notifikasi WhatsApp; webhook tidak valid/gagal tidak boleh memicu pesan sukses.
- Semua notifikasi peserta menggunakan WhatsApp; email tidak digunakan. Acuan event dan template pesan: `docs/notifikasi-code-1790904241894.md`. Pengingat bayar formulir dikirim setiap Senin selama status belum bayar dan gelombang masih terbuka; berhenti saat pembayaran berhasil/gelombang ditutup. Kuota penuh memicu penutupan, pembatalan invoice pending, dan pesan bahwa daftar ulang gelombang berikutnya opsional.
- TIU wajib memakai SEB pada komputer desktop/laptop Windows atau macOS; perangkat seluler tidak didukung. Buat panduan instalasi/langkah peserta di `docs/PANDUAN_UJIAN_TIU_SEB.md`. Backend menukarkan tiket peluncuran sekali pakai, memeriksa pemilik attempt dan validasi SEB, baru mengikat attempt/memulai timer. Jangan menaruh secret/kunci jawaban di URL. Autosave jawaban ke server selama ujian. Jika koneksi pulih, peserta melanjutkan attempt yang sama dengan tiket resume baru; pulihkan jawaban dari server, timer tetap berjalan. Resume bukan retake atau attempt kedua.
- Halaman web biasa tidak dapat mengunci sistem operasi. Validasi server harus memeriksa Browser Exam Key/Config Key SEB, bukan hanya user-agent. SEB membatasi komputer yang menjalankannya, bukan perangkat kedua peserta.
- Validasi/pengecualian wajib: cegah pendaftaran tanpa periode aktif, gelombang aktif, dalam tanggal, dan kuota tersedia; template LoA bukan prasyarat pendaftaran. Validasi ulang di server saat pendaftaran/pembayaran; proses webhook idempoten dan hitungan kuota atomik; setelah kuota penuh tutup gelombang, batalkan invoice pending, hentikan pengingat Senin, dan tandai pembayaran terlambat sebagai pengecualian admin (jangan pindahkan pendaftar otomatis).
- Validasi TIU wajib mencakup tiket sekali pakai/kedaluwarsa, identitas pemilik attempt, status paket soal/durasi, kunci SEB server-side, penyimpanan jawaban, auto-submit, serta rekam timeout/koneksi putus. Resume memakai attempt yang sama, tidak membuat attempt baru; timer tidak di-reset. Sinkronisasi langsung dari Google Form tidak boleh merusak paket valid terakhir bila gagal atau tipe soal tak didukung. Otorisasi dossier/unduh dan audit akses dilakukan di server.
- Kebijakan TIU yang sudah diputuskan: Windows dan macOS desktop/laptop; satu attempt per pendaftar tanpa retake; jawaban otomatis tersimpan; setelah koneksi pulih resume attempt yang sama dan pulihkan jawabannya, sementara timer tetap berjalan. Jangan mengubah keputusan ini tanpa arahan.
- Pertanyaan terbuka: penanganan pembayaran ganda/terlambat dan izin melihat/mengunduh dossier lengkap.

## Acuan Dokumen

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
