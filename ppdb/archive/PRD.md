> ⚠️ **OBSOLETE — DO NOT USE**
>
> Dokumen versi **lama** untuk PPDB. Seluruh flow, model data, dan arsitektur sudah diganti (rebuild dari nol: Periode → Gelombang).
> **JANGAN dipakai.** Baca dokumentasi terbaru di `ppdb/README.md`, `ppdb/PRD.md`, `ppdb/FLOW.md`, `ppdb/ERD.md`, `ppdb/plan/PLAN.md`.

# Product Requirements Document (PRD)

# Sistem PPDB Terintegrasi Pesantren / Sekolah

## Document Information

| Item         | Value                                        |
| ------------ | -------------------------------------------- |
| Product Name | Sistem PPDB Terintegrasi Pesantren / Sekolah |
| Version      | 1.0                                          |
| Status       | Draft                                        |
| Product Type | Web Application                              |
| Platform     | Web Responsive                               |
| Prepared By  | Product Team                                 |
| Date         | July 2026                                    |

---

# 1. Product Overview

Sistem PPDB Terintegrasi merupakan platform digital yang digunakan untuk mengelola seluruh proses penerimaan peserta didik baru mulai dari pendaftaran, seleksi, pembayaran, pengumuman, hingga registrasi ulang dalam satu sistem terpusat.

Sistem dirancang untuk mendukung kebutuhan sekolah dan pesantren yang memiliki:

* Banyak periode PPDB
* Banyak gelombang pendaftaran
* Banyak jenjang pendidikan
* Banyak kategori pendaftaran
* Tahapan seleksi yang berbeda-beda
* Skema pembayaran yang fleksibel
* Proses administrasi yang terdokumentasi

---

# 2. Problem Statement

Proses PPDB pada banyak sekolah dan pesantren masih dilakukan menggunakan kombinasi:

* Google Form
* WhatsApp
* Spreadsheet
* Pembayaran manual
* Rekap dokumen terpisah

Hal ini menyebabkan:

* Data tersebar di banyak tempat
* Kesulitan monitoring status peserta
* Risiko kehilangan dokumen
* Human error pada pembayaran
* Sulit melakukan pelaporan
* Tidak adanya audit aktivitas

---

# 3. Product Goals

### Goal 1

Menyediakan proses PPDB end-to-end dalam satu platform.

### Goal 2

Mengurangi pekerjaan administratif manual.

### Goal 3

Mempermudah monitoring peserta oleh seluruh tim PPDB.

### Goal 4

Meningkatkan akurasi pembayaran dan pelaporan.

### Goal 5

Memberikan pengalaman pendaftaran yang mudah bagi calon murid dan orang tua.

---

# 4. Success Metrics

### Operational Metrics

* 90% proses PPDB dilakukan melalui sistem
* 80% pembayaran dilakukan secara online
* Pengurangan pekerjaan administratif minimal 50%
* Waktu verifikasi dokumen turun minimal 40%

### User Metrics

* Completion rate formulir > 85%
* Payment success rate > 95%
* Dokumen valid pada upload pertama > 80%

### System Metrics

* Uptime > 99%
* Response time < 2 detik
* Error rate < 1%

---

# 5. User Personas

## Persona 1 â€” Calon Murid

Tujuan:

* Mendaftar sekolah
* Upload dokumen
* Mengikuti seleksi
* Melihat hasil seleksi

Kebutuhan:

* Proses mudah
* Informasi status yang jelas
* Pembayaran praktis

---

## Persona 2 â€” Orang Tua

Tujuan:

* Memantau proses pendaftaran anak

Kebutuhan:

* Notifikasi cepat
* Informasi biaya
* Jadwal yang jelas

---

## Persona 3 â€” Admin Seleksi

Tujuan:

* Memverifikasi dokumen
* Mengelola tahapan seleksi

Kebutuhan:

* Dashboard monitoring
* Review dokumen yang efisien

---

## Persona 4 â€” Penguji

Tujuan:

* Melakukan penilaian tes

Kebutuhan:

* Input nilai cepat
* Parameter penilaian fleksibel

---

## Persona 5 â€” Finance

Tujuan:

* Mengelola pembayaran

Kebutuhan:

* Monitoring tagihan
* Monitoring cicilan
* Laporan pendapatan

---

## Persona 6 â€”Â  Admin Utama

Tujuan:

* Mengelola seluruh proses PPDB

Kebutuhan:

* Konfigurasi penuh
* Monitoring menyeluruh

---

# 6. Product Scope

## Included

### Registrasi Online

* Registrasi akun
* Login
* Auto generate akun
* Auto login link

### Pembayaran

* Invoice otomatis
* Payment gateway
* Validasi manual

### Dokumen

* Upload dokumen
* Verifikasi dokumen
* Revisi dokumen

### Seleksi

* Dynamic flow
* Dynamic test
* Dynamic scoring

### Pengumuman

* Kelulusan
* Surat penerimaan

### Registrasi Ulang

* Jadwal registrasi ulang
* MPLS

### Finance

* Pembayaran tahap 1
* Pembayaran tahap 2
* Cicilan uang pangkal

### Monitoring

* Dashboard
* Laporan
* Audit Trail

---

## Out of Scope V1

* Mobile App Native
* E-signature tersertifikasi
* Integrasi EMIS
* Integrasi Dapodik
* Integrasi Virtual Account Bank Mandiri/BCA
* AI Interview Assessment

---

# 7. Core Modules

## Module A â€” PPDB Configuration

Digunakan Superadmin untuk mengatur seluruh konfigurasi PPDB.

Fitur:

* Manajemen periode (Hanya ada 1 Periode Aktif pada satu waktu. Saat admin mengaktifkan periode, periode sebelumnya akan otomatis tertutup, dan seluruh tampilan data di Dashboard & tabel Admin akan otomatis hanya menampilkan data yang terikat dengan periode aktif tersebut).
* Manajemen gelombang
* Manajemen jenjang
* Manajemen kategori
* Pengaturan kuota
* Pengaturan flow seleksi

---

## Module B â€” Applicant Management

Digunakan calon murid.

Fitur:

* Registrasi
* Login
* Profil peserta
* Status pendaftaran

---

## Module C â€” Document Management

Fitur:

* Upload dokumen
* Review dokumen
* Approval
* Revision

---

## Module D â€” Selection Management

Fitur:

* Jenis tes dinamis
* Penjadwalan tes
* Penilaian tes
* Kelulusan

---

## Module E â€” Payment Management

Fitur:

* Invoice
* Pembayaran online
* Pembayaran manual
* Diskon
* Cicilan

---

## Module F â€” MOU Management

Fitur:

* Generate MOU
* Upload MOU
* Approval MOU

---

## Module G â€” Acceptance Management

Fitur:

* Surat penerimaan
* Registrasi ulang
* MPLS

---

## Module H â€” Academic Calendar

Fitur:

* Agenda akademik
* Kalender akademik

---

## Module I â€” Notification Center

Fitur:

* WhatsApp Notification
* Email Notification
* Reminder otomatis

---

## Module J â€” Reporting

Fitur:

* Export PDF
* Export Excel
* Dashboard

---

# 8. User Journey

## Journey 1 â€” Registrasi

Registrasi Akun
â†“
Verifikasi Kontak
â†“
Buat Akun
â†“
Login
â†“
Lengkapi Data
â†“
Pembayaran Tahap 1

---

## Journey 2 â€” Seleksi

Pembayaran Valid
â†“
Upload Dokumen
â†“
Review Dokumen
â†“
Jadwal Tes
â†“
Mengikuti Tes
â†“
Penilaian
â†“
Pengumuman

---

## Journey 3 â€” Kelulusan

Lulus
â†“
Download MOU
â†“
Upload MOU
â†“
Approve MOU
â†“
Pembayaran Tahap 2
â†“
Accepted

---

## Journey 4 â€” Registrasi Ulang

Accepted
â†“
Registrasi Ulang
â†“
MPLS
â†“
Menjadi Siswa Aktif

---

# 9. Notification Strategy

## WhatsApp

Digunakan untuk:

* Registrasi berhasil
* Invoice dibuat
* Pembayaran berhasil
* Jadwal tes
* Hasil seleksi
* Reminder cicilan
* Reminder registrasi ulang

---

## Email

Digunakan untuk:

* Akun dan password
* Invoice PDF
* Bukti pembayaran PDF
* Surat penerimaan
* Kalender akademik
* Dokumen resmi

---

# 10. Dashboard Requirements

## Superadmin

(Semua data di dashboard akan difilter secara default berdasarkan **Periode Aktif**)

* Total Pendaftar
* Total Lulus
* Total Tidak Lulus
* Total Pendapatan
* Conversion Funnel PPDB

---

## Finance

* Invoice Aktif
* Pending Payment
* Pendapatan
* Cicilan

---

## Seleksi

* Dokumen Pending
* MOU Pending
* Jadwal Tes

---

## Penguji

* Tes Belum Dinilai
* Nilai Tes
* Kelulusan

---

# 11. Risks

### Risiko Operasional

* Dokumen tidak lengkap
* Pembayaran terlambat
* Kuota penuh

### Risiko Teknis

* Payment gateway downtime
* Email delivery gagal
* WhatsApp delivery gagal

### Mitigasi

* Retry mechanism
* Queue system
* Audit trail
* Monitoring dashboard

---

# 12. Future Roadmap

## Phase 2

* Mobile Application
* Parent Portal
* Student Portal
* Virtual Account

## Phase 3

* AI Document Validation
* AI Recommendation Scoring
* AI Interview Assessment

## Phase 4

* Integrasi Dapodik
* Integrasi EMIS
* Integrasi ERP Sekolah

---

# 13. Release Criteria

Produk dinyatakan siap Go-Live apabila:

* Seluruh flow PPDB dapat dijalankan end-to-end
* Payment gateway berhasil terintegrasi
* Notifikasi berjalan normal
* Dashboard berjalan normal
* Audit trail aktif
* Backup database aktif
* UAT selesai dan disetujui stakeholder

