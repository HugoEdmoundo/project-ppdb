# DOKUMENTASI SISTEM NOTIFIKASI WHATSAPP PPDB

**Versi:** Acuan terbaru kebutuhan PPDB
**Modul:** Notifikasi WhatsApp

Semua notifikasi kepada pendaftar dikirim melalui WhatsApp; email tidak digunakan. Dokumen ini adalah spesifikasi alur terbaru, bukan klaim bahwa seluruh pemicu sudah tersedia di aplikasi. Pengingat terjadwal dikirim hanya kepada penerima yang statusnya masih memenuhi syarat.

**Status kode saat ini:** infrastruktur WhatsApp dan sebagian pemicu lama sudah ada. Pengingat Senin, notifikasi kuota penuh/pembatalan invoice, webhook skor TIU Apps Script beserta notifikasi hasilnya belum terimplementasi pada alur baru. Endpoint cron pengingat tersedia, tetapi jadwal pemanggil eksternalnya tidak tercatat di repository. Panel template saat ini masih menampilkan pilihan channel email; pilihan itu tidak sesuai keputusan terbaru dan email tetap tidak boleh digunakan.

**Keputusan lintas notifikasi:** pengingat pembayaran formulir dikirim setiap hari Senin maksimal satu kali per pendaftar per pekan, sampai pembayaran berhasil atau gelombang ditutup. Jika kuota tercapai, sistem menutup gelombang, membatalkan tagihan formulir yang masih pending, dan memberi tahu pendaftar bahwa mendaftar lagi di gelombang berikutnya bersifat opsional. Jika webhook pembayaran sukses tiba setelah tagihan dibatalkan, tandai untuk pemeriksaan admin dan jangan pindahkan pendaftar otomatis. TIU dikerjakan satu kali di aplikasi PPDB melalui SEB desktop/laptop Windows atau macOS. Nilai TIU masuk otomatis secara real-time melalui webhook Apps Script; admin tidak memasukkan nilai manual. Webhook harus idempoten agar retry tidak menggandakan hasil atau notifikasi.

---

## FASE 1: PENDAFTARAN AWAL & FORMULIR

### 1. Pendaftaran Akun Berhasil
*   **Trigger:** Pendaftar klik submit pada form pendaftaran awal.
*   **Template Pesan:**
> 📢 **Pendaftaran Akun Berhasil!**
> 
> Assalamu’alaikum / Halo *[Nama Pendaftar]*,
> Terima kasih telah mendaftar di *[Nama Sekolah/Pesantren]*. Akun PPDB Anda telah berhasil dibuat.
> 
> Berikut adalah detail akses Anda:
> 👤 Username: *[Username]*
> 🔑 Password: *[Password]*
> 🌐 Link Login: *[Link URL Aplikasi]*
> 
> ⚠️ *Penting:* 
> Langkah Anda selanjutnya adalah melakukan **Pembayaran Biaya Formulir**. Harap segera login ke sistem untuk melihat tagihan Anda. Batas akhir pembayaran formulir adalah sampai gelombang pendaftaran ditutup pada *[Tanggal Tutup Gelombang]*.

### 2. Pembayaran Formulir Berhasil
*   **Trigger:** Webhook Pak Kasir mendeteksi pembayaran formulir lunas.
*   **Template Pesan:**
> ✅ **Pembayaran Formulir Berhasil!**
> 
> Halo *[Nama Pendaftar]*,
> Pembayaran formulir pendaftaran Anda telah kami terima. Terima kasih!
> 
> 📁 *Langkah Selanjutnya:*
> Anda sekarang sudah bisa mengunggah (upload) dokumen persyaratan. Harap persiapkan dokumen wajib (NISN, KK, Akte, Pas Foto) dan dokumen tambahan sesuai jalur pendaftaran Anda. 
> 
> Silakan login dan lengkapi dokumen Anda di sini: *[Link URL Aplikasi]*

### 3. Penutupan Gelombang (Pembayaran Formulir Expired)
*   **Event key:** `wave_closed_pending_payment`
*   **Trigger:** Gelombang ditutup karena tanggal berakhir atau kuota tercapai; tagihan formulir yang masih pending dibatalkan.
*   **Template Pesan:**
> ❌ **Masa Pembayaran Formulir Telah Berakhir**
> 
> Halo *[Nama Pendaftar]*,
> Mohon maaf, masa pembayaran formulir untuk Gelombang *[Nama Gelombang]* telah resmi ditutup dan tagihan Anda otomatis dibatalkan.
> 
> Anda boleh mendaftar lagi pada gelombang berikutnya jika tersedia, tetapi tidak wajib. Silakan cek informasi pendaftaran di *[Link URL Aplikasi]*. Terima kasih.

### 4. Pengingat Pembayaran Formulir Setiap Senin
*   **Event key:** `payment_reminder_monday`
*   **Trigger:** Setiap hari Senin untuk pendaftar yang belum membayar, selama gelombang masih terbuka dan tagihan belum dibatalkan.
*   **Berhenti jika:** Pembayaran formulir berhasil, gelombang ditutup, atau tagihan dibatalkan.
*   **Template Pesan:**
> 🔔 **PENGINGAT PEMBAYARAN FORMULIR**
>
> Halo *[Nama Pendaftar]*, pembayaran formulir Anda masih belum kami terima. Silakan lanjutkan pembayaran sebelum gelombang *[Nama Gelombang]* ditutup pada *[Tanggal Tutup]*.
>
> Lanjutkan pendaftaran: *[Link Pembayaran/Aplikasi]*
>
> Abaikan pesan ini jika Anda sudah membayar.

---

## FASE 2: VERIFIKASI DOKUMEN

### 5. Dokumen Ditolak (Revisi)
*   **Trigger:** Admin Verifikator menekan tombol "Reject Dokumen".
*   **Template Pesan:**
> ⚠️ **Pemberitahuan Revisi Dokumen PPDB**
> 
> Halo *[Nama Pendaftar]*,
> Tim kami telah memeriksa dokumen yang Anda unggah. Mohon maaf, dokumen Anda belum dapat divalidasi karena alasan berikut:
> 
> ❌ *[Catatan Admin / Alasan Penolakan]*
> 
> 🔄 *Langkah Selanjutnya:*
> Agar dapat melanjutkan ke tahap Ujian, silakan login ke *[Link URL Aplikasi]* dan unggah ulang dokumen perbaikan sesegera mungkin.

### 6. Dokumen Disetujui (Approved)
*   **Trigger:** Admin Verifikator menekan tombol "Approve Semua".
*   **Template Pesan (Jika Jalur Selain TIU):**
> ✅ **Dokumen Disetujui!**
> 
> Halo *[Nama Pendaftar]*,
> Alhamdulillah, seluruh dokumen persyaratan Anda telah *valid dan disetujui*.
> 
> 📅 *Langkah Selanjutnya:*
> Anda sudah bisa memilih jadwal ujian. Silakan login ke *[Link URL Aplikasi]* dan lakukan *Take Session* untuk **Ujian Tahfidz** sekarang.

*   **Template Pesan (Jika Jalur TIU):**
*   **Event key:** `tiu_exam_instructions`
> ✅ **Dokumen Disetujui!**
> 
> Halo *[Nama Pendaftar]*,
> Alhamdulillah, dokumen persyaratan Anda telah *valid*.
> 
> 📝 *Langkah Selanjutnya:*
> Sebagai pendaftar jalur TIU, Anda perlu mengerjakan tes satu kali di aplikasi PPDB menggunakan Safe Exam Browser (SEB) pada komputer desktop/laptop Windows atau macOS. Google Form tidak dibuka oleh peserta. Silakan baca panduan instalasi dan penggunaan SEB di *[Link Panduan TIU-SEB]*, lalu masuk ke dashboard untuk memulai tes.

### 7. Nilai TIU Berhasil Masuk
*   **Event key:** `tiu_result_ready`
*   **Trigger:** Backend menerima dan memvalidasi webhook Apps Script, menyimpan nilai TIU ke attempt milik pendaftar, lalu memperbarui hasil di sistem secara real-time.
*   **Aturan:** Webhook harus memuat identitas attempt/pendaftar yang dapat diverifikasi. Proses harus idempoten agar pengiriman ulang tidak membuat nilai atau notifikasi ganda. Jika webhook tidak valid/gagal, jangan kirim notifikasi hasil sukses; catat kegagalan agar admin dapat menindaklanjuti.
*   **Template Pesan:**
> ✅ **HASIL TES TIU TERSEDIA**
>
> Halo *[Nama Pendaftar]*, hasil tes TIU Anda sudah masuk ke sistem.
>
> Nilai: *[Nilai TIU]*
>
> Silakan login ke aplikasi PPDB untuk melihat hasil dan tahapan berikutnya: *[Link Aplikasi]*

---

## FASE 3: UJIAN & WAWANCARA

### 8. Konfirmasi Jadwal (Take Session Berhasil)
*   **Trigger:** Pendaftar selesai memilih jadwal (Tahfidz/Wawancara).
*   **Template Pesan:**
> 📅 **Jadwal Ujian Terkonfirmasi**
> 
> Halo *[Nama Pendaftar]*,
> Jadwal untuk *[Nama Ujian: Ujian Tahfidz / Wawancara]* Anda telah berhasil diatur.
> 
> 📆 Tanggal: *[Tanggal]*
> ⏰ Waktu: *[Jam Mulai - Jam Selesai]*
> 📍 Lokasi/Link: *[Detail Lokasi atau Link Zoom]*
> 
> Harap hadir/bergabung 15 menit sebelum waktu yang ditentukan. Semoga sukses!

### 9. Hasil Ujian Tahfidz Telah Diinput
*   **Trigger:** Penguji Tahfidz menyimpan nilai ke sistem.
*   **Template Pesan:**
> ✅ **Ujian Tahfidz Selesai**
> 
> Halo *[Nama Pendaftar]*,
> Nilai Ujian Tahfidz Anda telah berhasil direkam ke dalam sistem. 
> 
> 🗣️ *Langkah Selanjutnya:*
> Tahapan berikutnya adalah Wawancara. Akses untuk memilih jadwal wawancara kini telah dibuka. Silakan login ke *[Link URL Aplikasi]* dan segera lakukan *Take Session* untuk Wawancara.

### 10. Ujian Wawancara Selesai (Menunggu Pengumuman)
*   **Trigger:** Penguji Wawancara menyimpan nilai.
*   **Template Pesan:**
> ✅ **Rangkaian Seleksi Selesai!**
> 
> Halo *[Nama Pendaftar]*,
> Anda telah menyelesaikan seluruh rangkaian tes dan wawancara PPDB. Terima kasih atas usaha keras Anda.
> 
> Saat ini, tim panitia sedang merekapitulasi seluruh nilai akhir Anda. Keputusan final (Pengumuman Kelulusan) akan segera diinformasikan melalui WhatsApp ini dan Dashboard Anda. Harap bersabar menunggu.

---

## FASE 4: KELULUSAN & PEMBAYARAN TAHAP 2 (DP)

### 11. Pengumuman: LULUS
*   **Trigger:** Admin klik LULUS dan LoA ter-generate.
*   **Template Pesan:**
> 🎉 **ALHAMDULILLAH, ANDA DINYATAKAN LULUS!**
> 
> Selamat *[Nama Pendaftar]*, Anda dinyatakan **LULUS** seleksi PPDB *[Nama Sekolah/Pesantren]*!
> 
> Surat Keterangan / *Letter of Acceptance (LoA)* Anda sudah dapat diunduh di dashboard pendaftaran.
> 
> 💳 *Langkah Final (Penting):*
> Untuk mengamankan kursi Anda, silakan login ke *[Link URL Aplikasi]* dan lakukan pembayaran **Tahap 2 (DP)**. Anda memiliki batas waktu maksimal 3 BULAN sejak hari ini untuk melakukan pelunasan DP. Anda juga dapat mengatur skema cicilan untuk sisa tagihan di dalam aplikasi.
> 
> *(Catatan: Sesuai ketentuan, seluruh dana yang telah dibayarkan tidak dapat dikembalikan)*

### 12. Pengumuman: TIDAK LULUS
*   **Trigger:** Admin klik TIDAK LULUS.
*   **Template Pesan:**
> 📢 **Pengumuman Hasil Seleksi PPDB**
> 
> Halo *[Nama Pendaftar]*,
> Terima kasih telah mengikuti seluruh rangkaian seleksi di *[Nama Sekolah/Pesantren]* dengan sangat antusias.
> 
> Dengan berat hati kami sampaikan bahwa berdasarkan hasil rekapitulasi nilai, Anda **BELUM LULUS** pada penerimaan kali ini. 
> 
> Jangan berkecil hati, tetap semangat belajar dan semoga Anda mendapatkan tempat pendidikan yang terbaik. Terima kasih.

### 13. Pengingat Berkala Pembayaran Tahap 2 (DP)
*   **Trigger:** Cron-job mingguan. Dikirim setiap pekan selama batas 3 bulan jika DP belum lunas.
*   **Template Pesan:**
> 🔔 **PENGINGAT PEMBAYARAN TAHAP 2 (DP) PPDB**
> 
> Halo *[Nama Pendaftar]*,
> Kami ingin mengingatkan kembali bahwa Anda telah dinyatakan LULUS, namun kami belum menerima pembayaran Tahap 2 (DP) Anda.
> 
> Untuk mengamankan kursi pendaftaran Anda dan agar bisa bergabung ke Grup WhatsApp Angkatan, mohon segera melakukan pelunasan DP. 
> 
> Batas waktu maksimal pembayaran Anda tersisa: *[Sisa Waktu, misal: 2 Pekan lagi]* pada tanggal *[Tanggal Jatuh Tempo 3 Bulan]*. 
> Abaikan pesan ini jika Anda sedang dalam proses pembayaran. Silakan bayar di sini: *[Link URL Aplikasi]*

### 14. Pembayaran Tahap 2 (DP) Berhasil & SKD
*   **Trigger:** Webhook mendeteksi DP Tahap 2 lunas.
*   **Template Pesan:**
> ✅ **PEMBAYARAN TAHAP 2 BERHASIL!**
> 
> Alhamdulillah, Halo *[Nama Pendaftar]*, 
> Pembayaran DP Anda telah kami terima. Anda kini **RESMI** menjadi bagian dari *[Nama Sekolah/Pesantren]*!
> 
> 📄 Surat Keterangan Diterima (SKD) & No. Registrasi sudah dapat diunduh di dashboard.
> 💳 Status Tagihan Cicilan: AKTIF.
> 
> 📱 *PENTING - GABUNG GRUP WHATSAPP:*
> Silakan bergabung ke Grup WhatsApp Resmi Calon Siswa/Santri melalui tautan berikut:
> *[Link Group WhatsApp]*
> 
> *(Mohon tautan tidak disebar ke pihak luar)*

---

## FASE 5: PENGINGAT TAHAPAN LANJUTAN

Fitur ini berjalan otomatis di latar belakang untuk menekan angka pendaftar yang mandek di tengah proses.

### 1. Pengingat Upload Dokumen (H+3)
*   **Trigger:** 3 hari setelah status formulir LUNAS, namun user belum mengunggah file di modul dokumen.
*   **Template Pesan:**
> 🔔 **PENGINGAT UPLOAD DOKUMEN**
> Halo *[Nama Pendaftar]*, pendaftaran Anda sudah aktif tapi Anda belum mengunggah dokumen wajib. Yuk, segera lengkapi di *[Link URL Aplikasi]* agar bisa lanjut ke tahap ujian!

### 2. Pengingat Take Session Ujian (H+2)
*   **Trigger:** 2 hari setelah dokumen "Approved" ATAU nilai TIU masuk, namun pendaftar belum klik "Take Session".
*   **Template Pesan:**
> 🔔 **PENGINGAT PILIH JADWAL UJIAN**
> Halo *[Nama Pendaftar]*, dokumen Anda sudah disetujui! Jangan biarkan jadwal penuh, segera pilih jadwal ujian Anda sekarang di *[Link URL Aplikasi]*.

### 3. Pengingat Ujian (1 Jam Sebelum Pelaksanaan)
*   **Trigger:** Dikirim otomatis 1 jam sebelum jam pelaksanaan Ujian (Tahfidz/Wawancara) dimulai.
*   **Template Pesan:**
> 🔔 **PENGINGAT UJIAN (1 JAM LAGI)**
> 
> Halo *[Nama Pendaftar]*,
> Mengingatkan kembali bahwa Ujian *[Tahfidz/Wawancara]* Anda akan dimulai **1 jam lagi** pada pukul *[Waktu]*.
> 
> 📍 **Detail/Link:** *[Detail Lokasi atau Link Zoom]*
> 
> Harap segera bersiap dan gabung/hadir 15 menit sebelum sesi dimulai. Semoga sukses!

### 4. Pengingat Cicilan Bulanan
*   **Trigger:** H-3 sebelum tanggal jatuh tempo cicilan yang dipilih oleh pendaftar pada saat setting cicilan Tahap 2.
*   **Template Pesan:**
> 🔔 **PENGINGAT TAGIHAN CICILAN**
> Halo *[Nama Pendaftar]*, tagihan cicilan PPDB Anda (Periode *[Bulan]*) sejumlah *[Nominal]* akan jatuh tempo pada *[Tanggal]*. Silakan login ke *[Link URL Aplikasi]* untuk melakukan pembayaran.
