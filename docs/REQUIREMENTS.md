# Requirement & Business Logic PPDB

Dokumen ini memuat aturan bisnis utama untuk sistem Penerimaan Peserta Didik Baru (PPDB).

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

## Tanpa Pemilihan Jenjang Pendidikan

Sistem **tidak mengenal daftar jenjang pendidikan** (`SMP`, `SMK`, atau nilai lain) dan **tidak menyediakan pemilihan jenjang di mana pun**: tidak di formulir pendaftaran, tidak di dashboard pendaftar, tidak di konfigurasi gelombang, dan tidak di halaman publik. Pendaftar tidak memilih, tidak mengisi, dan tidak dapat mengubah jenjang.

Jenjang bukan data yang disentrakkan pendaftar. Bila jenjang masih perlu dicantumkan pada dokumen (LoA, SKD, transkrip), perlakukan sebagai atribut tetap institusi yang diambil dari satu konfigurasi tingkat sekolah, bukan dari pilihan pengguna.

Implikasi:
- Tidak ada daftar jenjang valid (whitelist) di backend dan tidak ada kontrol jenjang di UI admin maupun pendaftar.
- Scope/config gelombang hanya memuat hal yang benar-benar dipilih pendaftar, yaitu jalur pendaftaran. Jangan menambah kolom atau opsi jenjang baru.
- Halaman publik hanya menampilkan informasi umum, bukan pilihan jenjang.
- Field/kolom jenjang yang sudah ada di implementasi lama adalah sisa flow lama: perlakukan sebagai artefak yang tidak dipakai, jangan jadikan sumber kebenaran, dan jangan tambahkan UI atau endpoint baru yang bergantung padanya. Perubahan model data (misalnya penghapusan kolom) perlu keputusan tersendiri.

## Struktur Formulir Pendaftaran Publik

Sistem menggunakan formulir pendaftaran bertahap (wizard) dengan 7 bagian (section) utama untuk memudahkan pendaftar:

1. **Pilih Jalur**: Pilihan jalur pendaftaran aktif berdasarkan gelombang. Opsi ditampilkan bersih tanpa embel-embel seperti `(Non-TIU)` atau `(Tes TIU)`.
2. **Identitas Calon Murid**: Data pribadi siswa, termasuk asal sekolah.
3. **Data Orang Tua/Wali**: Data lengkap meliputi Nama, Pekerjaan, dan Nomor WA untuk Ayah dan Ibu. Data Wali bersifat opsional. Terdapat juga input Email Orang Tua/Wali dan Penghasilan Per Bulan.
4. **Kontak**: Email dan Nomor WA pendaftar. Sistem wajib meminta pengguna memverifikasi data ini kembali karena akan digunakan untuk pengiriman kredensial.
5. **Domisili**: Alamat lengkap, Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa, dan Kode Pos.
6. **Identifikasi Kesehatan**: Kuesioner riwayat kesehatan yang menggantikan fungsi medcheck (ditampilkan secara internal, namun di UI publik cukup berlabel "Identifikasi Kesehatan").
7. **Pernyataan & Persetujuan**: Konfirmasi akhir (review) dengan 4 persetujuan (checkbox) yang wajib dicentang sebelum tombol *submit* aktif.

Data orang tua/wali yang terkumpul pada langkah ini wajib disinkronisasi tampilannya di seluruh *dashboard* operasional (Admin, Superadmin, dan profil Pendaftar) secara lengkap, bukan hanya direduksi menjadi satu baris `parent_name`.

## Formulir Identifikasi Kesehatan

Formulir ini menggantikan Medcheck. Diisi sendiri oleh pendaftar pada formulir pendaftaran (bukan oleh petugas medis), dan hasilnya disimpan sebagai data profil kesehatan pendaftar yang dapat dibuka admin pada halaman detail/dossier pendaftar.

Struktur pertanyaan, urutan, dan caption dipertahankan:

1. **Riwayat penyakit kronis** — Ya / Tidak. Jika **Ya**, isi kolom keterangan (sebutkan penyakitnya).
2. **Pernah didiagnosis kondisi tertentu** — checkbox: Asma, Diabetes, Epilepsi, Penyakit jantung, Hipertensi, TBC, Lainnya. Opsi "Lainnya" punya isian bebas. Tersedia kolom keterangan untuk menjelaskan pilihan.
3. **Alergi** — Ya / Tidak. Jika **Ya**, pilih jenis alergi dengan checkbox: Makanan, Obat, Debu, Lainnya (isian bebas). Tersedia kolom keterangan untuk menjelaskan pilihan.
4. **Pengobatan rutin** — "Apakah Anda sedang menjalani pengobatan rutin atau mengonsumsi obat tertentu secara berkala?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
5. **Keterbatasan fisik** — "Apakah Anda memiliki kondisi kesehatan atau keterbatasan fisik yang perlu diketahui sekolah?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
6. **Riwayat rawat inap** — "Apakah Anda pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
7. **Kebutuhan khusus** — "Apakah Anda memiliki kebutuhan khusus terkait kesehatan selama mengikuti kegiatan belajar?" Ya / Tidak. Jika **Ya**, isi kolom keterangan.
8. **Nama kontak darurat.**
9. **Hubungan kontak darurat dengan calon peserta didik.**
10. **Nomor telepon kontak darurat.**

**Pernyataan** (wajib dibaca/disetujui pendaftar): "Saya menyatakan bahwa informasi kesehatan yang saya berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat perubahan kondisi kesehatan, saya bersedia memberitahukan pihak sekolah."

Perilaku formulir:
- Setiap pertanyaan Ya/Tidak membuka turunannya secara kondisional. Kolom keterangan pada pertanyaan yang dijawab "Tidak" dikosongkan dan tidak ikut terkirim.
- Pertanyaan 2 dan 3 adalah daftar checkbox, bukan Ya/Tidak; tidak perlu memaksa minimal satu centang.
- Pernyataan harus dikonfirmasi pendaftar sebelum formulir bisa dikirim; pengiriman tanpa persetujuan tidak sah.
- Validasi bersyarat wajib dijalankan ulang di server saat pendaftaran, bukan hanya di sisi klien.
- Data kesehatan bersifat sensitif: batasi aksesnya dengan izin khusus, sertakan dalam audit akses, dan sudah tercakup dalam dossier/unduhan ZIP pada halaman Arsip/Cari Pendaftar.

## Arsip dan Pencarian Dossier Pendaftar
Pencarian lintas periode dan gelombang berada di **halaman khusus Arsip/Cari Pendaftar**. Jangan menambahkan filter periode/gelombang ini ke semua halaman admin. Halaman khusus ini dapat mencari semua pendaftar lintas periode/gelombang dan membuka dossier lengkap dalam satu tindakan.

Dossier yang tampil dari satu tindakan mencakup biodata, seluruh dokumen yang pernah diunggah dan riwayat verifikasinya, hasil TIU, sesi serta nilai Tahfidz/wawancara, keputusan kelulusan, LoA, pembayaran dan cicilan, serta SKD/nomor registrasi jika sudah tersedia. Sediakan unduhan per berkas dan paket ZIP satu klik yang berisi ringkasan PDF serta dokumen asli dalam folder terstruktur. Status periode aktif mengatur pendaftaran yang sedang berjalan, bukan visibilitas arsip. Batasi halaman dossier dengan izin khusus karena berisi data pribadi dan pembayaran.

Data pendaftar dan turunannya harus bisa dirunut ke periode/gelombang melalui relasi pendaftar: dokumen/verifikasi, tagihan/pembayaran/cicilan, hasil TIU, sesi/nilai Tahfidz dan wawancara, keputusan, LoA, serta SKD/nomor registrasi. Data tersebut menjadi sumber pencarian dossier dan tidak menambah filter global di halaman lain.

Konfigurasi biaya, kuota, tanggal, dan diskon melekat ke gelombang. Jadwal/rubrik harus dapat direkonstruksi sesuai yang dipakai saat ujian, dan dokumen LoA/SKD yang sudah digenerate disimpan sebagai artefak tetap.

## Ujian TIU di Safe Exam Browser (SEB)
Admin menyusun soal dan kunci nilai kuis di Google Form serta menambahkan 1 pertanyaan bertipe Jawaban Singkat (Short Answer) bertema "Token" (Wajib Isi). Admin mengambil Pre-filled URL dari Google Form tersebut (dengan token placeholder `{token}`) dan menyimpannya di Pengaturan TIU backoffice PPDB. Pengaturan URL Google Form, webhook secret Apps Script, dan durasi ujian (menit) berlaku secara global, bukan per gelombang.

Setiap pendaftar jalur TIU hanya mendapat satu attempt ujian; tidak ada retake setelah ujian selesai atau waktu habis. Dari portal dashboard PPDB (tahap Seleksi), peserta mengunduh file konfigurasi `.seb` (`ujian-tiu.seb`) via endpoint `/selection/applicants/me/tiu-seb`. Saat file `.seb` di-generate, server backend mengikat attempt tunggal peserta, men-generate token unik, dan mencatat waktu mulai ujian (timer server).

File `.seb` berisi `StartURL` menuju Pre-filled Google Form dengan token peserta sudah terisi otomatis di kolom pertanyaan token. Ujian wajib dikerjakan dari komputer desktop atau laptop (Windows 10/11 atau macOS) menggunakan Safe Exam Browser. Ponsel/tablet (Android/iOS) tidak didukung. SEB mengunci layar perangkat dan menyembunyikan bilah URL sehingga peserta tidak dapat membuka aplikasi lain atau mengubah token peserta.

Setelah peserta menyelesaikan soal dan mengklik **Submit** di Google Form, trigger `onSubmit` Google Apps Script pada Form secara otomatis membaca skor kuis serta token peserta, lalu mengirimkannya ke webhook backend PPDB (`POST /ppdb/webhook/tiu`) secara real-time dengan header `X-TIU-Secret`.

Backend PPDB memvalidasi:
1. Header `X-TIU-Secret` harus cocok dengan webhook secret yang tersimpan.
2. Token attempt harus valid dan terdaftar pada pendaftar yang bersangkutan.
3. Waktu penerimaan webhook tidak boleh melebihi batas durasi (waktu submit <= waktu mulai attempt + durasi ujian + 5 menit toleransi jaringan).

Setelah validasi berhasil, nilai disimpan ke kriteria ujian TIU pendaftar secara idempoten (mencegah duplikasi), dan backend memicu notifikasi WhatsApp hasil TIU (`tiu_result_ready`) ke nomor peserta. Nilai TIU masuk murni dari webhook; admin tidak menginput nilai TIU secara manual di backoffice. Bagi pendaftar jalur Tes/TIU, kelulusan/terselesaikannya ujian TIU menjadi prasyarat sebelum sesi ujian Tahfidz dapat dipilih.

Jika terjadi kendala koneksi atau perangkat restart di tengah ujian, peserta dapat membuka kembali file `.seb` selama batas durasi server belum habis (Google Form menyediakan penyimpanan draft/autosave saat peserta login). Timer server tetap berjalan dan tidak di-reset.

## Validasi dan Pengecualian Wajib
- **Konfigurasi/publikasi:** cegah pembukaan pendaftaran jika tidak ada periode aktif, gelombang aktif, template siap, tanggal tidak valid, atau kuota habis. Tampilkan alasan dan tindakan berikutnya dengan bahasa nonteknis.
- **Pendaftaran/pembayaran:** validasi ulang status periode, gelombang, tanggal, dan kuota di server saat pendaftaran dan pembayaran. Catat pembayaran secara idempoten agar webhook duplikat tidak menambah hitungan kuota dua kali; reservasi slot dan hitung pembayaran harus atomik saat banyak pembayaran masuk bersamaan.
- **Kuota tercapai:** tutup gelombang dan pendaftaran satu kali, batalkan seluruh tagihan formulir pending, kirim notifikasi, dan hentikan pengingat Senin. Jika webhook sukses datang setelah tagihan dibatalkan, tandai sebagai pengecualian untuk pemeriksaan admin—jangan otomatis memindahkan pendaftar ke gelombang lain atau menghilangkan pembayaran.
- **TIU/SEB:** tolak pengunduhan SEB jika pendaftar sudah memiliki nilai TIU atau durasi attempt telah habis. Validasi webhook secret `X-TIU-Secret`, kecocokan token attempt, dan batas toleransi durasi ujian. Proses webhook secara idempoten sehingga submit ulang tidak menggandakan hasil atau notifikasi.
- **Formulir kesehatan:** server memvalidasi kelengkapan jawaban — setiap pertanyaan Ya/Tidak terisi, keterangan terisi bila jawabannya "Ya", isian "Lainnya" terisi bila dicentang, nomor telepon darurat valid, dan pernyataan disetujui. Tolak payload yang tidak memenuhi aturan tersebut dan jangan diam-diam menyimpan jawaban yang tidak valid.
- **Dossier/unduhan:** periksa izin khusus di server untuk melihat dan mengunduh data sensitif; audit unduhan ZIP maupun berkas perorangan.

## Keputusan yang Masih Terbuka
- Apakah jadwal/rubrik/LoA/SKD memakai konfigurasi per gelombang atau versi snapshot? Rekomendasi: jadwal/rubrik dapat direkonstruksi sesuai attempt dan LoA/SKD yang sudah dibuat dibekukan.
- Bagaimana menangani webhook pembayaran ganda atau pembayaran terlambat setelah tagihan dibatalkan karena kuota penuh?
- TIU didukung pada komputer desktop/laptop Windows dan macOS. Perangkat seluler tidak didukung.
- Kebijakan TIU diputuskan: satu attempt per pendaftar, tanpa retake. Waktu timer server berjalan sejak unduh SEB; nilai dikirim via webhook Apps Script onFormSubmit.
- Siapa yang memiliki izin melihat/mengunduh dossier lengkap?
- Apakah kedudukan jenjang pada dokumen (LoA/SKD/transkrip) perlu setting tersendiri di backoffice, atau cukup satu konfigurasi tingkat sekolah yang tetap?
- Apakah formulir kesehatan boleh diperbarui pendaftar setelah pendaftaran (misalnya lewat dashboard), dan sampai kapan?
- Apakah seluruh pertanyaan 1–10 wajib dijawab sebelum pendaftaran berhasil, atau pertanyaan kesehatan boleh dijawab "Tidak"/dikosongkan?
- Siapa yang berhak membaca data kesehatan di luar admin pemverifikasi, dan apakah perlu jejak audit khusus untuk akses data kesehatan?
- Berapa lama data kesehatan pendaftar disimpan?
