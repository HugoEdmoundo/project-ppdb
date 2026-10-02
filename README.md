# PPDB — Konfigurasi Backoffice

Dokumen ini merangkum arah sistem PPDB baru berdasarkan alur di [`docs/`](docs/). Sistem yang berjalan dan dokumentasi lama belum dianggap sebagai acuan kebutuhan baru. Fokus pembahasan saat ini adalah konfigurasi backoffice sebelum pendaftaran dibuka.

## Alur Konfigurasi Admin

Admin menyiapkan komponen berikut dari dashboard backoffice:

1. **Gelombang pendaftaran** — tanggal buka/tutup, harga formulir, kuota pendaftar, diskon DP3/gedung/SPP, diskon untuk X pendaftar pertama, dan minimal DP.
2. **Template dan LoA** — generate/preview LoA sebelum publish, klausul dana tidak dapat dikembalikan, dan latar SKD.
3. **Rubrik penilaian** — kriteria, bobot, dan formulir evaluator untuk Tahfidz dan wawancara. Nilai TIU berasal otomatis dari ujian pilihan ganda dan webhook, tanpa input manual admin.
4. **Sesi Tahfidz** — jadwal, penguji, mode online/offline, serta tautan Zoom atau lokasi.
5. **Sesi wawancara** — jadwal, pewawancara, mode online/offline, serta tautan Zoom atau lokasi.
6. **Pengaturan TIU global** — Google Form sebagai sumber soal, webhook secret, durasi tes, dan Apps Script untuk menyinkronkan soal ke aplikasi PPDB. Pengaturan ini tidak dibuat per gelombang.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran.

## Periode dan Gelombang

Gelombang tetap berada di dalam periode dan memuat pengaturan pembukaan pendaftaran, kuota, diskon, dan komponen biaya. Hanya satu periode yang aktif secara global. Mengaktifkan periode menonaktifkan periode lain beserta gelombang di luar periode itu; menonaktifkan periode menonaktifkan gelombang di dalamnya. Gelombang hanya bisa aktif jika periode induknya aktif, dan setiap periode hanya boleh memiliki satu gelombang aktif.

Pendaftaran publik hanya bergantung pada gelombang aktif di periode aktif, jadwal pendaftaran, dan kuota yang belum penuh. Template LoA bukan prasyarat pendaftaran; konfigurasi TIU, rubrik, dan jadwal harus siap sebelum fungsi terkait digunakan.

Jumlah gelombang per periode fleksibel tanpa jumlah tetap; maksimal satu gelombang aktif per periode. Karena periode aktif hanya satu, pendaftar otomatis masuk ke gelombang aktif di periode itu dan tidak memilih gelombang sendiri.

Kuota dan diskon untuk X pendaftar awal dihitung berdasarkan pembayaran formulir yang berhasil. Ketika kuota tercapai, pendaftaran dan gelombang ditutup otomatis, tagihan formulir belum dibayar dibatalkan, dan pendaftar diberi tahu bahwa mereka boleh mendaftar lagi di gelombang berikutnya. Selama gelombang masih terbuka, pendaftar belum bayar menerima pengingat setiap hari Senin.

## Arsip dan Pencarian Dossier Pendaftar

Pencarian lintas periode dan gelombang berada di **halaman khusus Arsip/Cari Pendaftar**. Jangan menambahkan filter periode/gelombang ini ke semua halaman admin. Halaman khusus ini dapat mencari semua pendaftar lintas periode/gelombang dan membuka dossier lengkap dalam satu tindakan.

Dossier yang tampil dari satu tindakan mencakup biodata, seluruh dokumen yang pernah diunggah dan riwayat verifikasinya, hasil TIU, sesi serta nilai Tahfidz/wawancara, keputusan kelulusan, LoA, pembayaran dan cicilan, serta SKD/nomor registrasi jika sudah tersedia. Sediakan unduhan per berkas dan paket ZIP satu klik yang berisi ringkasan PDF serta dokumen asli dalam folder terstruktur. Status periode aktif mengatur pendaftaran yang sedang berjalan, bukan visibilitas arsip. Batasi halaman dossier dengan izin khusus karena berisi data pribadi dan pembayaran.

Data pendaftar dan turunannya harus bisa dirunut ke periode/gelombang melalui relasi pendaftar: dokumen/verifikasi, tagihan/pembayaran/cicilan, hasil TIU, sesi/nilai Tahfidz dan wawancara, keputusan, LoA, serta SKD/nomor registrasi. Data tersebut menjadi sumber pencarian dossier dan tidak menambah filter global di halaman lain.

Konfigurasi biaya, kuota, tanggal, dan diskon melekat ke gelombang. Jadwal/rubrik harus dapat direkonstruksi sesuai yang dipakai saat ujian, dan dokumen LoA/SKD yang sudah digenerate disimpan sebagai artefak tetap.

## Ujian TIU di Aplikasi

Admin menyusun soal dan kunci nilai di Google Form. Apps Script menyinkronkan soal secara langsung ke backend tanpa langkah review/publish manual; soal, urutan, opsi, dan kunci mengikuti sumber Google Form untuk tipe soal yang didukung. Tampilan ujian tetap berada di aplikasi PPDB, bukan Google Form. Jika sinkronisasi gagal atau ada tipe soal yang tidak didukung, pertahankan paket terakhir yang valid dan beri admin pesan yang jelas. Pengaturan Form, webhook secret, dan durasi berlaku global. Nilai TIU masuk otomatis melalui webhook Apps Script secara real-time, tanpa input nilai manual admin. Event membawa applicant ID atau attempt ID; backend menautkan hasil ke periode/gelombang lewat relasi pendaftar.

Setelah nilai TIU tersedia, Apps Script mengirim hasil ke backend melalui webhook secara real-time. Backend memvalidasi identitas pendaftar/attempt, menyimpan nilai secara idempoten, memperbarui hasil, lalu memicu notifikasi WhatsApp kepada pendaftar. Jika webhook tidak valid/gagal, jangan tampilkan hasil sukses atau kirim notifikasi sukses; catat agar admin dapat menindaklanjuti.

Setiap pendaftar hanya mendapat satu attempt TIU; tidak ada retake setelah attempt selesai atau waktu habis. Klik **Mulai TIU** menyiapkan attempt dan tiket peluncuran sekali pakai untuk membuka SEB langsung ke halaman ujian internal. Server baru mengikat attempt dan memulai timer setelah tiket valid, SEB terverifikasi, dan sesi ujian siap. Jawaban disimpan otomatis ke server selama ujian. Saat timer habis, jawaban tersimpan dikumpulkan otomatis; hasil nilai masuk melalui webhook Apps Script dan menjadi nilai resmi attempt tunggal. Backend memvalidasi identitas attempt dan mencegah webhook duplikat menggandakan hasil/notifikasi.

Jika koneksi terputus, jawaban yang berhasil tersimpan di server tetap aman. Setelah koneksi pulih, peserta membuka TIU kembali melalui SEB dengan tiket resume baru yang terikat ke attempt aktif yang sama; sistem memulihkan jawaban tersimpan agar peserta melanjutkan dari sana, bukan memulai attempt baru. Timer server tetap berjalan selama koneksi terputus dan tidak di-reset; jika waktu habis sebelum tersambung kembali, sistem mengumpulkan jawaban yang tersimpan dan menilai attempt tersebut.

TIU wajib dikerjakan dari komputer desktop melalui Safe Exam Browser (SEB). Aplikasi PPDB menyediakan konfigurasi SEB dengan Start URL menuju halaman ujian di aplikasi. Setelah peserta memasang SEB, tombol Mulai membuka konfigurasi tersebut; timer baru berjalan setelah attempt terbuka di SEB dan validasi lolos. Panduan langkah peserta ada di [`docs/PANDUAN_UJIAN_TIU_SEB.md`](docs/PANDUAN_UJIAN_TIU_SEB.md).

SEB adalah aplikasi lockdown/kiosk terpisah yang dapat membatasi perpindahan aplikasi di komputer yang menjalankannya; halaman web biasa tidak bisa mengunci perangkat. SEB tidak membatasi perangkat kedua. Backend harus memvalidasi Browser Exam Key/Config Key sebelum attempt dimulai; user-agent saja mudah dipalsukan.

## Batas Fokus Saat Ini

Verifikasi dokumen, pemantauan nilai, pelaksanaan ujian, keputusan kelulusan, LoA, pembayaran tahap 2/cicilan, dan penerbitan SKD tercantum dalam dokumen alur lain. Tahapan tersebut menjadi konteks sistem, tetapi pembahasan dan perubahan sekarang berfokus pada konfigurasi/backoffice.

## Notifikasi WhatsApp

Notifikasi peserta menggunakan WhatsApp saja; email tidak digunakan. Acuan event, isi pesan, dan syarat pengiriman ada di [`docs/notifikasi-code-1790904241894.md`](docs/notifikasi-code-1790904241894.md). Cakupan terbaru mencakup pengingat pembayaran formulir setiap Senin, pembatalan invoice/notifikasi saat kuota tercapai, panduan TIU-SEB, serta pemberitahuan hasil TIU setelah webhook Apps Script berhasil memperbarui nilai.

## Status Implementasi Saat Ini

Kode yang ada masih mengikuti sistem lama. Form pendaftaran sudah meminta nama lengkap, email, WhatsApp, dan biodata; ketika ujian dibuat nanti, identitas peserta diambil dari akun pendaftar yang login, tanpa form nama terpisah.

Validasi lama sudah mencakup format sejumlah field pendaftaran, jalur/jenjang gelombang, dan urutan tanggal. Kode lama juga otomatis menautkan pendaftar ke gelombang aktif, tetapi gelombang itu dicari secara global. Ini belum sama dengan aturan baru per periode.

Validasi dan fitur baru belum diimplementasikan: penutupan gelombang dan pembatalan tagihan pending saat kuota penuh, pengingat Senin, sinkronisasi soal, attempt/timer/server grading, webhook skor TIU Apps Script dan notifikasi hasilnya, serta launch, validasi, autosave, dan resume attempt via SEB. README dan panduan agent adalah spesifikasi perubahan, bukan klaim bahwa fitur sudah tersedia.

### Validasi dan Pengecualian Wajib

- **Konfigurasi/publikasi:** cegah pembukaan pendaftaran jika tidak ada periode aktif, gelombang aktif, template siap, tanggal tidak valid, atau kuota habis. Tampilkan alasan dan tindakan berikutnya dengan bahasa nonteknis.
- **Pendaftaran/pembayaran:** validasi ulang status periode, gelombang, tanggal, dan kuota di server saat pendaftaran dan pembayaran. Catat pembayaran secara idempoten agar webhook duplikat tidak menambah hitungan kuota dua kali; reservasi slot dan hitung pembayaran harus atomik saat banyak pembayaran masuk bersamaan.
- **Kuota tercapai:** tutup gelombang dan pendaftaran satu kali, batalkan seluruh tagihan formulir pending, kirim notifikasi, dan hentikan pengingat Senin. Jika webhook sukses datang setelah tagihan dibatalkan, tandai sebagai pengecualian untuk pemeriksaan admin—jangan otomatis memindahkan pendaftar ke gelombang lain atau menghilangkan pembayaran.
- **TIU/SEB:** jangan mulai timer sebelum tiket sekali pakai, attempt, paket soal hasil sinkronisasi yang valid, durasi, dan validasi SEB lolos. Tolak tiket kedaluwarsa/terpakai, peserta bukan pemilik attempt, klien bukan SEB terverifikasi, atau attempt yang tidak memenuhi syarat; simpan jawaban berkala dan rekam timeout/koneksi putus agar admin dapat meninjau tanpa mengubah nilai diam-diam.
- **Sinkronisasi soal:** validasi webhook secret, struktur dan tipe soal, kunci, duplikasi, serta paket kosong/tidak lengkap. Impor gagal tidak boleh mengganti paket aktif; sediakan pesan kesalahan dan log yang aman tanpa membocorkan secret/kunci.
- **Dossier/unduhan:** periksa izin khusus di server untuk melihat dan mengunduh data sensitif; audit unduhan ZIP maupun berkas perorangan.

Alur peluncuran yang direncanakan: PPDB membuat attempt pending dan tiket acak, singkat masa berlakunya, sekali pakai; tautan/konfigurasi SEB membuka route ujian internal. Route menukarkan tiket ke backend, backend memverifikasi kunci SEB dan kepemilikan peserta, lalu baru mengikat sesi dan memulai timer server. Jangan menaruh webhook secret, jawaban, atau kunci jawaban dalam URL/konfigurasi yang dikirim ke browser.

## Keputusan yang Masih Terbuka

- Apakah jadwal/rubrik/LoA/SKD memakai konfigurasi per gelombang atau versi snapshot? Rekomendasi: jadwal/rubrik dapat direkonstruksi sesuai attempt dan LoA/SKD yang sudah dibuat dibekukan.
- Bagaimana menangani webhook pembayaran ganda atau pembayaran terlambat setelah tagihan dibatalkan karena kuota penuh?
- Semua soal TIU adalah pilihan ganda dengan satu jawaban benar. Paket soal mengikuti Google Form secara langsung; tidak ada tahap review/publish manual. Payload tidak valid harus menghasilkan error sinkronisasi tanpa merusak paket valid terakhir.
- TIU didukung pada komputer desktop/laptop Windows dan macOS. Perangkat seluler tidak didukung.
- Kebijakan TIU diputuskan: satu attempt per pendaftar, tanpa retake. Jawaban otomatis disimpan; setelah koneksi pulih, peserta melanjutkan attempt yang sama dengan jawaban tersimpan. Timer server tetap berjalan saat putus koneksi; jawaban tersimpan dikumpulkan saat waktu habis.
- Siapa yang memiliki izin melihat/mengunduh dossier lengkap?

## Dokumen Acuan

- [`docs/backoffice-code-1790813618837.txt`](docs/backoffice-code-1790813618837.txt) — daftar konfigurasi backoffice.
- [`docs/admin-code-1790812960259.txt`](docs/admin-code-1790812960259.txt) — proses admin setelah konfigurasi.
- [`docs/pendaftar-code-1790812852070.txt`](docs/pendaftar-code-1790812852070.txt) — alur pendaftar.
- [`docs/gemini-code-1790824113350.txt`](docs/gemini-code-1790824113350.txt) — contoh formulir penilaian wawancara.
- [`AGENTS.md`](AGENTS.md) — panduan kerja agent dan ringkasan kebutuhan backoffice.
