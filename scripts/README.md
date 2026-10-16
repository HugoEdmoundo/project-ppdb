# scripts/

Skrip operasional dan artefak bantu yang dipindahkan dari akar repo dan `apps/api` agar
struktur project tetap bersih. Bukan bagian dari aplikasi (tidak di-import oleh
`apps/*` maupun `packages/*`).

## Tooling

- `sync-build.sh` — Sinkronisasi salinan Windows → WSL lalu build + start Docker Compose
  (`docker compose up -d --build`). Menjalankan normalisasi line-ending CRLF→LF sebelum build.
  Dijalankan dari PowerShell:
  ```powershell
  wsl -e bash /mnt/c/<path-ke-repo>/scripts/sync-build.sh
  ```

## debug/

Artefak **sekali-pakai** dari sesi debugging deployment (WSL/Docker). Disimpan hanya untuk
referensi historis — kemungkinan besar tidak akan berguna lagi. Jalankan hanya bila Anda
tahu konteksnya; beberapa berisi kredensial dev hardcoded (bukan rahasia produksi).

- `fix_check3.sh`, `fix_check4.sh` — cek port NAT/VM, health API, status sesi WhatsApp.
- `fix_crlf.sh` — perbaiki line-ending CRLF pada skrip/Dockerfile/compose.
- `verify.sh`, `verify2.sh`, `verify3.sh` — verifikasi deployment (compose ps, health, CORS, alembic).
  `verify3.sh` memuat API key dev hardcoded.
- `test_api.sh` — kirim notifikasi WhatsApp via API; memuat password superadmin seed dev.
- `test_payload.json` — payload contoh WhatsApp (nomor fiktif).
- `test.py`, `test_db.py`, `test_script.py`, `test_send.py` — skrip debug ad-hoc
  (query DB, login + kirim notifikasi). Diimpor dari `apps/api/src/*` sehingga harus
  dijalankan dengan working directory `apps/api`. `test_script.py` memuat password
  superadmin seed dev.
