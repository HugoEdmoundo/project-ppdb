# FLOW — Alur Sistem PPDB (Periode → Gelombang)

Bahasa: Indonesia · Referensi aturan: [`PRD.md`](./PRD.md)

## 1. Alur Admin: Mengonfigurasi Pendaftaran

```
[1] Buat Periode                 → status = inactive (dipaksa)
[2] (opsional) Buat Gelombang    → status = inactive (dipaksa), boleh walau periode belum aktif
[3] Aktifkan Periode             → periode lain + gelombangnya jadi inactive; periode ini active
[4] Aktifkan Gelombang           → hanya boleh jika periode induk active; gelombang lain jadi inactive
[5] Pendaftaran TERBUKA          → hanya saat 1 periode + 1 gelombang aktif
```

## 2. Alur Aktivasi Periode

```
PUT /ppdb/periods/:id/activate
  ├─ (transaksi)
  ├─ UPDATE semua periode SET status='inactive' (kecuali :id)
  ├─ UPDATE semua gelombang yang periodenya != :id SET status='inactive'
  ├─ UPDATE periode :id SET status='active'
  └─ auditLog
```

## 3. Alur Aktivasi Gelombang

```
PUT /ppdb/waves/:id/activate
  ├─ cek periode induk: status == 'active'?
  │     ✗ 400 "Periode belum aktif"
  │     ✓ lanjut
  ├─ (transaksi)
  ├─ UPDATE semua gelombang (kecuali :id) SET status='inactive'  → global
  ├─ UPDATE gelombang :id SET status='active'
  └─ auditLog
```

## 4. Alur Nonaktivasi

```
PUT /ppdb/periods/:id/deactivate
  ├─ (transaksi)
  ├─ UPDATE periode :id SET status='inactive'
  ├─ UPDATE semua gelombang period_id=:id SET status='inactive'   → otomatis ikut non-aktif
  └─ auditLog

PUT /ppdb/waves/:id/deactivate
  ├─ UPDATE gelombang :id SET status='inactive'
  └─ auditLog
```

## 5. Matriks Visibilitas Data Pendaftar

Tanpa periode+gelombang aktif → sistem "tertutup":

| Periode aktif | Gelombang aktif | Form input pendaftar | Data pendaftar tampil |
|---|---|---|---|
| ✗ | ✗ | ✗ tertutup | ✗ tidak tampil |
| ✓ | ✗ | ✗ tertutup | ✗ tidak tampil |
| ✓ | ✓ | ✓ terbuka | ✓ tampil |
| ✗ | ✓ | **tidak mungkin** (aturan #5) | — |

## 6. Ringkasan Invariants

- `count(periode.active) == 1` atau `0` — tidak pernah `> 1`.
- `count(gelombang.active) == 1` atau `0` — tidak pernah `> 1`.
- `gelombang.active ⇒ period(gelombang).active`.
- `period.deactivate ⇒ semua gelombang-nya inactive`.
- Status hanya berubah lewat `/activate` & `/deactivate`; create/update biasa selalu `inactive` dan tidak menyentuh status.
