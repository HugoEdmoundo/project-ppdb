# Requirement & Business Logic PPDB

Dokumen ini memuat aturan bisnis utama untuk sistem Penerimaan Peserta Didik Baru (PPDB) Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

---

## Alur Konfigurasi Admin (Backoffice)
Admin menyiapkan komponen berikut dari dashboard backoffice sebelum pendaftaran dibuka:
1. **Gelombang pendaftaran** — tanggal buka/tutup, harga formulir, kuota pendaftar, diskon DP3/gedung/SPP, diskon untuk X pendaftar pertama, dan minimal DP.
2. **Template dan LoA** — generate/preview LoA sebelum publish, klausul dana tidak dapat dikembalikan, dan latar SKD.
3. **Rubrik penilaian** — kriteria, bobot, dan formulir evaluator untuk Tahfidz dan wawancara. Nilai TIU berasal otomatis dari ujian pilihan ganda dan webhook, tanpa input manual admin.
4. **Session 1:1 Tahfidz** — jadwal, penguji, mode online/offline, serta tautan Zoom atau lokasi tatap muka.
5. **Session 1:1 Wawancara** — jadwal, pewawancara, mode online/offline, serta tautan Zoom atau lokasi tatap muka.
6. **Pengaturan TIU global** — Pre-filled Google Form URL (dengan placeholder `{token}`), webhook secret, durasi tes, dan Apps Script untuk menyinkronkan nilai ke aplikasi PPDB secara real-time. Pengaturan ini tidak dibuat per gelombang.

Pendaftaran publik dibuka ketika ada gelombang aktif di periode aktif, jadwal pendaftaran sudah masuk, dan kuota pembayaran formulir belum penuh. Template LoA bukan prasyarat pendaftaran dibuka.

---

## Periode dan Gelombang

- Gelombang berada di dalam periode dan memuat pengaturan pembukaan pendaftaran, kuota, diskon, dan komponen biaya.
- **Hanya satu periode yang aktif secara global.** Mengaktifkan periode menonaktifkan periode lain beserta gelombang di luar periode itu; menonaktifkan periode menonaktifkan gelombang di dalamnya.
- **Setiap periode hanya boleh memiliki satu gelombang aktif.** Gelombang hanya bisa aktif jika periode induknya aktif. Mengaktifkan gelombang baru menggantikan gelombang aktif sebelumnya.
- Jumlah gelombang per periode fleksibel tanpa batas tetap.
- Calon santri otomatis masuk ke gelombang aktif di periode aktif dan **tidak memilih gelombang sendiri**.
- Kuota dan diskon untuk X pendaftar awal dihitung berdasarkan **pembayaran formulir yang berhasil**. Ketika kuota tercapai, pendaftaran dan gelombang ditutup otomatis, tagihan formulir pending dibatalkan, dan pengingat Senin dihentikan.

---

## Tanpa Pemilihan Jenjang Pendidikan

- Sistem **tidak mengenal daftar jenjang pendidikan** (`SMP`, `SMK`, atau nilai lain) dan **tidak menyediakan pemilihan jenjang di mana pun**: tidak di formulir pendaftaran, tidak di dashboard pendaftar, tidak di konfigurasi gelombang, dan tidak di halaman publik. Pendaftar tidak memilih, tidak mengisi, dan tidak dapat mengubah jenjang.
- Jenjang bukan data yang diinput pendaftar. Bila jenjang masih perlu dicantumkan pada dokumen (LoA, SKD, transkrip), perlakukan sebagai atribut tetap institusi yang diambil dari konfigurasi tingkat sekolah, bukan dari pilihan pengguna.
- Scope/config gelombang hanya memuat jalur pendaftaran yang dipilih pendaftar.
- Field/kolom jenjang yang sudah ada di implementasi lama adalah sisa flow lama: perlakukan sebagai artefak tidak aktif, jangan jadikan sumber kebenaran, dan jangan tambahkan UI atau endpoint baru yang bergantung padanya.

---

## Struktur Formulir Pendaftaran Publik

Sistem menggunakan formulir pendaftaran bertahap (wizard) dengan 7 bagian (section) utama:

1. **Pilih Jalur**: Pilihan jalur pendaftaran aktif berdasarkan gelombang. Opsi ditampilkan bersih tanpa embel-embel seperti `(Non-TIU)` atau `(Tes TIU)`.
2. **Identitas Calon Murid**: Data pribadi santri dan asal sekolah.
3. **Data Orang Tua/Wali**: Data lengkap meliputi Nama, Pekerjaan, dan Nomor WA untuk Ayah dan Ibu. Data Wali bersifat opsional. Terdapat juga input Email Orang Tua/Wali dan Penghasilan Per Bulan.
4. **Kontak**: Email dan Nomor WA pendaftar. Sistem wajib meminta pengguna memverifikasi data ini kembali karena digunakan untuk pengiriman kredensial.
5. **Domisili**: Alamat lengkap, Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa, dan Kode Pos.
6. **Identifikasi Kesehatan**: Kuesioner riwayat kesehatan yang menggantikan fungsi medcheck (berlabel "Identifikasi Kesehatan").
7. **Pernyataan & Persetujuan**: Konfirmasi akhir dengan 4 persetujuan (checkbox) yang wajib dicentang sebelum tombol *submit* aktif.

Data orang tua/wali yang terkumpul pada langkah ini wajib disinkronisasi tampilannya di seluruh *dashboard* operasional (Admin, Superadmin, dan profil Pendaftar) secara lengkap, bukan hanya direduksi menjadi satu baris `parent_name`.

---

## Formulir Identifikasi Kesehatan (Pengganti Medcheck)

Formulir ini menggantikan Medcheck. Diisi sendiri oleh pendaftar pada formulir pendaftaran (bukan oleh petugas medis), dan hasilnya disimpan sebagai data profil kesehatan pendaftar yang dapat dibuka admin pada halaman detail/dossier pendaftar.

Struktur 10 pertanyaan baku:
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

**Pernyataan** (wajib disetujui pendaftar): *"Saya menyatakan bahwa informasi kesehatan yang saya berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat perubahan kondisi kesehatan, saya bersedia memberitahukan pihak sekolah."*

Perilaku formulir:
- Pertanyaan Ya/Tidak membuka turunannya secara kondisional. Kolom keterangan pada pertanyaan yang dijawab "Tidak" dikosongkan dan tidak ikut terkirim.
- Pertanyaan 2 dan 3 adalah daftar checkbox, tidak memaksa minimal satu centang.
- Pernyataan wajib disetujui sebelum submit.
- Validasi bersyarat dijalankan ulang di backend saat pendaftaran.
- Data kesehatan bersifat sensitif: batasi aksesnya dengan izin khusus, sertakan dalam audit akses, dan sudah tercakup dalam dossier/unduhan ZIP pada halaman Arsip/Cari Pendaftar.

---

## Ujian TIU di Safe Exam Browser (SEB)

- Admin menyusun soal kuis di Google Form dan menambahkan 1 pertanyaan bertipe Short Answer bertema "Token" (Wajib Isi). Admin mengambil Pre-filled URL dari Google Form tersebut (dengan placeholder `{token}`) dan menyimpannya di Pengaturan TIU backoffice PPDB. Pengaturan URL, webhook secret Apps Script, dan durasi ujian berlaku secara global.
- Setiap pendaftar jalur TIU hanya mendapat **satu attempt ujian**; tidak ada retake setelah ujian selesai atau waktu habis.
- Dari portal pendaftar (`/applicant/ujian-tiu`), peserta mengunduh file `.seb` (`ujian-tiu.seb`) via endpoint `/selection/applicants/me/tiu-seb`. Saat file di-generate, server mengikat attempt tunggal peserta, membuat token unik, dan mencatat waktu mulai ujian (timer server).
- File `.seb` berisi `StartURL` menuju Pre-filled Google Form dengan token peserta sudah terisi otomatis. Ujian wajib dikerjakan dari komputer desktop atau laptop (Windows 10/11 atau macOS) menggunakan Safe Exam Browser. SEB mengunci layar perangkat dan menyembunyikan bilah URL.
- Setelah peserta menekan tombol **Submit** di Google Form, trigger `onSubmit` Apps Script membaca skor dan token, lalu mengirimkannya ke webhook backend PPDB (`POST /ppdb/webhook/tiu`) secara real-time dengan header `X-TIU-Secret`.
- Backend memvalidasi header `X-TIU-Secret`, keabsahan token attempt, dan batas durasi (`waktu submit <= waktu mulai + durasi + 5 menit toleransi`).
- Nilai disimpan idempoten dan memicu notifikasi WhatsApp hasil TIU (`tiu_result_ready`). Admin tidak menginput nilai TIU manual.
- Jika terjadi kendala koneksi atau perangkat restart di tengah ujian, peserta dapat membuka kembali file `.seb` selama durasi server belum habis (Google Form mendukung autosave saat login). Timer server tetap berjalan dan tidak di-reset.

---

## Integrasi Payment Gateway Pakasir API v2 & Pembayaran Tahap 2

Sistem PPDB mengintegrasikan gerbang pembayaran resmi **Pakasir API v2** untuk pembayaran formulir dan biaya masuk santri baru:

1. **Biaya Formulir:**
   - Setelah registrasi, sistem membuat tagihan formulir.
   - Pendaftar melakukan pembayaran via QRIS dinamis (`POST /payment/create-qris`).
   - Webhook Pakasir (`POST /payment/webhook` / `POST /payment/webhook/pak-kasir`) memvalidasi pembayaran secara atomik & idempoten menggunakan header `X-Secret`.
   - Setelah lunas, kuitansi resmi terbit (`GET /payment/receipt/{id}` dan link publik `/kuitansi/:id`).
2. **Kelulusan & Penandatanganan LoA:**
   - Pendaftar yang dinyatakan lulus oleh panitia dapat melihat hasil seleksi di `/applicant/pengumuman`.
   - Pendaftar dan orang tua wajib membubuhkan tanda tangan digital pada Letter of Acceptance (LoA) sebelum melanjutkan ke pembayaran DP (`POST /ppdb/applicants/me/sign-loa`).
   - LoA resmi dapat diverifikasi publik di `/loa/:registrationNo`.
3. **Pembayaran Tahap 2 (DP) & Pengaturan Cicilan:**
   - Syarat utama pendaftar resmi diterima adalah pelunasan **DP (Down Payment)** di `/applicant/bayar-dp`.
   - Pendaftar yang sudah membayar DP dapat mengatur skema cicilan untuk sisa tagihan pendidikan (`POST /payment/stage2/my-installment-plan`) di `/applicant/pembayaran-tahap2`.
   - Scheduler backend (`apps/api/src/core/scheduler.py`) mengirimkan notifikasi pengingat via WhatsApp H-3 sebelum tanggal jatuh tempo cicilan pendaftar.
4. **Penerbitan SKD & Komunitas Resmi:**
   - Setelah DP Tahap 2 berstatus lunas, sistem secara otomatis menerbitkan **Surat Keterangan Diterima (SKD)** bernomor registrasi unik resmi (`REG-{YYYYMMDD}-{XXXX}`).
   - Sistem menampilkan tautan eksklusif untuk bergabung ke **Grup WhatsApp Resmi Santri Baru**.

---

## Arsip dan Pencarian Dossier Pendaftar

- Pencarian lintas periode dan gelombang berada di **halaman khusus Arsip/Cari Pendaftar (`/admin/arsip`)**. Tidak ditambahkan ke tabel operasional lain.
- Dossier lengkap mencakup: biodata santri & orang tua, berkas asli beserta riwayat verifikasi, kuesioner kesehatan, skor TIU, nilai sesi 1:1 Tahfidz & Wawancara, keputusan kelulusan, LoA bertanda tangan, histori transaksi pembayaran formulir/DP/cicilan, serta SKD resmi.
- Mendukung unduhan berkas perorangan dan paket bundle ZIP satu-klik (`GET /ppdb/archive/applicants/{id}/dossier/zip`).
- Akses dossier dibatasi dengan izin khusus dan seluruh aktivitas unduhan dicatat dalam `audit_log` bersama alamat IP admin pemohon.

---

## Validasi dan Pengecualian Wajib

- **Konfigurasi/publikasi:** Cegah pembukaan pendaftaran jika tidak ada periode aktif, gelombang aktif, tanggal di luar rentang, atau kuota habis.
- **Pendaftaran/pembayaran:** Validasi ulang status periode, gelombang, tanggal, dan kuota di server saat pendaftaran dan pembayaran. Reservasi slot dan kalkulasi kuota dijalankan atomik.
- **Kuota tercapai:** Tutup gelombang dan pendaftaran satu kali, batalkan seluruh tagihan formulir pending, kirim notifikasi, dan hentikan pengingat Senin.
- **Pengecualian Pembayaran Terlambat:** Jika webhook sukses datang setelah tagihan dibatalkan karena kuota penuh, tandai transaksi sebagai pengecualian (`late_payment_exception`) untuk pemeriksaan manual admin—jangan otomatis memindahkan pendaftar atau menghapus saldo.
- **TIU/SEB:** Tolak pengunduhan file SEB jika pendaftar sudah memiliki nilai TIU atau durasi attempt telah habis. Validasi webhook secret `X-TIU-Secret`, kecocokan token attempt, dan batas durasi ujian.
- **Formulir kesehatan:** Server memvalidasi kelengkapan jawaban (pertanyaan Ya/Tidak wajib ada keterangan jika "Ya", kontak darurat valid, pernyataan disetujui).
- **Dossier/unduhan:** Periksa izin khusus di server untuk melihat dan mengunduh data sensitif; audit unduhan ZIP maupun berkas perorangan.

---

## Status Keputusan Bisnis

### Keputusan yang Sudah Terselesaikan (*Resolved* di Kode):
- ✅ **Artefak Dokumen:** LoA dan SKD dibekukan sebagai artefak tetap (*immutable*) dengan nomor registrasi unik resmi.
- ✅ **Pembayaran Terlambat:** Ditandai sebagai pengecualian pemeriksaan admin (`late_payment_exception`), tidak dipindahkan otomatis.
- ✅ **Izin Dossier & Audit:** Dibatasi untuk admin berizin (`require_ppdb_admin`), dengan pencatatan jejak audit alamat IP pada setiap ekspor ZIP.
- ✅ **Kuesioner Kesehatan:** 10 pertanyaan baku wajib tervalidasi lengkap di server saat pendaftaran.

### Keputusan yang Masih Terbuka (Menunggu Kebijakan Yayasan):
- Apakah data kesehatan santri boleh diperbarui secara mandiri oleh santri/wali pasca-pendaftaran melalui dashboard?
- Berapa lama masa retensi berkas dan riwayat data kesehatan pendaftar yang tidak diterima?
- Apakah pencantuman jenjang pendidikan institusi pada template cetak dokumen perlu dikonfigurasi melalui backoffice tersendiri atau cukup satu konfigurasi statis institusi?
