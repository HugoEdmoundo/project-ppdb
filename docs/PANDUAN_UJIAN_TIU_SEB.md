# Panduan Ujian TIU (Safe Exam Browser)

Pendaftaran PPDB Pesantren Ar-Rahman jalur tertentu mewajibkan peserta untuk mengikuti Tes Intelegensia Umum (TIU) secara online. Untuk menjaga integritas ujian, tes ini dilaksanakan menggunakan aplikasi **Safe Exam Browser (SEB)**.

SEB akan mengunci layar komputer Anda sehingga Anda tidak bisa membuka aplikasi lain atau tab baru selama ujian berlangsung.

## 1. Spesifikasi Perangkat yang Didukung
- Komputer Desktop atau Laptop
- Sistem Operasi: **Windows** (Windows 10/11) atau **macOS**
- *Perangkat seluler (HP/Tablet) Android atau iOS tidak didukung.*

## 2. Cara Mengunduh & Instalasi SEB
1. Buka browser Anda dan kunjungi situs resmi: [https://safeexambrowser.org/download_en.html](https://safeexambrowser.org/download_en.html)
2. Klik tombol **Download** sesuai dengan sistem operasi komputer Anda (Pilih versi Windows atau macOS terbaru).
3. Setelah file installer selesai diunduh, klik ganda (double-click) file tersebut.
4. Ikuti petunjuk instalasi di layar (klik *Next / Install* hingga selesai).
5. Anda tidak perlu membuka aplikasi SEB secara manual setelah diinstal. Cukup biarkan terinstal di komputer.

## 3. Cara Memulai Ujian di Portal PPDB
1. Login ke *Dashboard* Pendaftar PPDB Ar-Rahman.
2. Masuk ke tahap **Ujian / Seleksi**.
3. Pastikan Anda sudah siap secara fisik dan mental, serta memiliki koneksi internet yang stabil.
4. Klik tombol **Download Konfigurasi SEB (.seb)**.
   *PERHATIAN: Waktu hitung mundur ujian (timer server) akan mulai berjalan sejak Anda mengeklik tombol ini!*
5. File bernama `ujian_tiu.seb` akan terunduh.
6. Klik ganda file `ujian_tiu.seb` tersebut. Komputer akan otomatis membuka SEB, mengunci layar, dan menampilkan soal ujian Google Form yang sudah terhubung dengan akun Anda.
7. Silakan kerjakan soal, lalu klik **Submit** jika sudah selesai.

## 4. Solusi Masalah / Error (Troubleshooting)

### A. File `.seb` Terbuka di Aplikasi Lain (Bukan SEB)
**Penyebab:** Ekstensi file `.seb` belum terasosiasi dengan aplikasi Safe Exam Browser.
**Solusi:**
- **Windows:** Klik kanan pada file `ujian_tiu.seb`, pilih **Open With...** -> **Choose another app**. Cari dan pilih "Safe Exam Browser", lalu centang *Always use this app to open .seb files*.
- **macOS:** Klik kanan file `ujian_tiu.seb`, pilih **Get Info**. Pada bagian *Open with:*, pilih "Safe Exam Browser", lalu klik tombol *Change All...*.

### B. SEB Meminta *Password* Saat Dibuka
**Penyebab:** Terjadi konflik konfigurasi atau file konfigurasi rusak/usang.
**Solusi:** Tutup SEB, hapus file `ujian_tiu.seb` yang lama. Kembali ke Dashboard PPDB, dan unduh ulang konfigurasinya. (Catatan: Waktu Anda terus berjalan, segera lakukan langkah ini).

### C. Komputer Tiba-tiba *Hang* atau Koneksi Internet Terputus Saat Ujian
**Penyebab:** Masalah teknis dari sisi perangkat atau jaringan peserta.
**Solusi:**
- Jangan panik. Anda bisa me-restart komputer dengan menekan dan menahan tombol Power/Daya.
- Setelah komputer menyala kembali dan koneksi internet terhubung, segera buka kembali file `ujian_tiu.seb` (jika waktu ujian Anda belum habis).
- Google Form memiliki fitur *auto-save* (bila Anda login Google) atau Anda mungkin harus mengulang pengisian jika form diatur tanpa login. Segera isi jawaban dan klik Submit sebelum batas waktu backend habis. Waktu timer di server PPDB tidak akan berhenti atau di-reset saat Anda offline.

### D. Muncul Peringatan "Session Not Allowed" atau Terblokir Antivirus
**Penyebab:** Antivirus pihak ketiga memblokir SEB karena SEB membatasi sistem.
**Solusi:** Matikan sementara (Disable) Antivirus Anda selama ujian berlangsung. SEB aman dan dirancang khusus untuk ujian institusi resmi di seluruh dunia.
