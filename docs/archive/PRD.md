# PRD — Penerimaan Peserta Didik Baru (PPDB)

Versi: **2.0 (rebuild dari nol)** · Bahasa: Indonesia (bagian bisnis)

> Dokumen ini adalah **satu-satunya sumber kebenaran** untuk kebutuhan bisnis PPDB.
> Versi lama (archive/) sudah OBSOLETE.

## 1. Tujuan

Modul PPDB mengelola proses penerimaan peserta didik baru secara digital. Versi ini memulai dari **inti sistem**: pengaturan **Periode** dan **Gelombang** pendaftaran beserta aturan aktivasinya. Fitur lain (pendaftar, verifikasi berkas, seleksi, pembayaran, MOU, daftar ulang, MPLS) **belum dibangun** dan menyusul di iterasi berikutnya.

## 2. Model Bisnis: Periode → Gelombang

### 2.1 Periode Pendaftaran

Satu siklus PPDB untuk satu tahun ajaran.

| Atribut | Keterangan |
|---|---|
| `name` | Nama periode (bebas), misal "PPDB 2026/2027" |
| `academic_year` | Tahun ajaran, misal `2026/2027` |
| `start_date` / `end_date` | Rentang tanggal periode |
| `status` | `inactive` atau `active` (default `inactive`) |
| `description` | Catatan opsional |

### 2.2 Gelombang

Sub-sesi pendaftaran di dalam sebuah periode. Satu periode bisa punya banyak gelombang.

| Atribut | Keterangan |
|---|---|
| `period_id` | Periode induk (FK) |
| `name` | Nama gelombang (bebas), misal "Gelombang 1" |
| `wave_number` | Nomor urut **otomatis** = `max(wave_number) + 1` dalam periode tsb |
| `start_date` / `end_date` | Rentang tanggal gelombang |
| `quota` | Kuota pendaftar |
| `status` | `inactive` atau `active` (default `inactive`) |

## 3. Aturan Aktivasi (WAJIB — inti sistem)

Empat entitas status: `inactive` / `active`. Berlaku secara **global** (seluruh sistem), bukan per-kantor/per-gelombang.

1. **Membuat gelombang TIDAK wajib menunggu periode aktif.** Gelombang boleh dibuat kapan saja selama periode induknya ada. Yang digate hanya **aktivasi**.
2. **Urutan wajib** untuk membuka pendaftaran:
   `buat periode → buat gelombang → aktifkan periode → aktifkan gelombang`.
3. **Hanya 1 periode aktif** di seluruh sistem. Saat sebuah periode diaktifkan, periode lain (beserta semua gelombangnya) otomatis non-aktif.
4. **Hanya 1 gelombang aktif** di seluruh sistem. Saat sebuah gelombang diaktifkan, gelombang lain otomatis non-aktif.
5. **Aktivasi gelombang hanya boleh jika periode induknya `active`.** Jika periode induk non-aktif → ditolak (HTTP 400 "Periode belum aktif").
6. **Menonaktifkan periode** → semua gelombang di dalamnya ikut non-aktif.
7. **Boleh semua non-aktif** (0 periode aktif, 0 gelombang aktif) → pendaftaran tertutup.
8. **Tanpa periode + gelombang aktif** → tidak ada input data pendaftar & tidak ada data pendaftar yang ditampilkan.

## 4. Hak Akses & Permission

- Backend menegakkan permission via `requireModuleAccess('ppdb', level)`.
- Level: `none < dashboard < read < crud`.
  - `crud` → boleh tambah/ubah/hapus/aktivasi periode & gelombang.
  - `read` → hanya melihat data.
  - `none`/`dashboard` → tidak mengakses modul (guard route).
- `user_type === 'superadmin'` → selalu full access (bypass).
- Frontend menampilkan tombol CRUD hanya bila level `crud` (hidden di frontend = UX; keamanan tetap di backend).

## 5. Scope Saat Ini (dikunci)

**Dibangun:**
- CRUD Periode + aktivasi/nonaktivasi.
- CRUD Gelombang + aktivasi/nonaktivasi (dengan aturan di atas).
- Enforce "1 periode aktif + 1 gelombang aktif" global.
- Audit trail untuk semua operasi aktivasi/nonaktivasi.

**TIDAK dibahas di iterasi ini (menyusul):**
- Jenjang pendidikan, kategori pendaftaran, alur seleksi.
- Data pendaftar, verifikasi berkas, tes seleksi, kelulusan.
- Pembayaran/invoice, MOU, daftar ulang, MPLS.
- Notifikasi & dashboard statistik.

## 6. Definisi Status

| Status | Arti |
|---|---|
| `inactive` | Tidak menerima pendaftaran (default saat dibuat) |
| `active` | Menerima pendaftaran (hanya 1 per periode/gelombang, global) |

Tidak ada status lain (tidak ada `draft`/`closed`/`open`/`archived`). Operasi status hanya lewat endpoint `/activate` dan `/deactivate` — bukan lewat update biasa.
