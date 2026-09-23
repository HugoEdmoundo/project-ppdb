# DOCKER_SETUP.md — Runbook Setup Docker Stack PTDARRAHMAN

> **Untuk AGENT AI / teman yang membuka repo ini:**
> Apa pun yang kamu diinstruksikan ("setup docker", "jalankan stack", "start semua service"),
> IKUTI dokumen ini LANGKAH DEMI LANGKAH secara verbatim.
> Semua non-negotiable di bagian **Aturan (Non-Negotiable)** sudah teruji di setup nyata —
> jangan diganti, jangan "dirajangkan", jangan pakai jalur alternatif kecuali bagian terserah dikatakan boleh.
> Verifikasi WAJIB dijalankan di akhir (bagian **Verifikasi**), karena terakhir kali setup gagal diam-diam.

---

## 1. Arsitektur (4 Service, 1 Compose)

```
docker-compose.yml
├── frontend  (Node/pnpm)  → menyajikan UI di host :3000 (Next), :5173 (Vite ppdb), :5174 (Vite superadmin)
├── api       (Python/FastAPI) → host :8080 (→ container 8000); akses DB MySQL + Redis; SSE
├── whatsapp  (Node/npm)  → hanya bind 127.0.0.1:3100 (internal-only, BUKAN untuk akses browser)
└── redis     (redis:7-alpine) → internal only (tidak di-expose)
```

- `apps/whatsapp` **BUKAN member pnpm workspace** (Node/npm standalone, container sendiri).
- Semua data persist via **named volumes**: `redis_data`, `wa_session`, `wa_logs`, `uploads_data`.
- `restart: unless-stopped` → container nyala otomatis saat dockerd start / WSL boot.

## 2. Prasyarat Environment

- **Windows + WSL2** (Ubuntu 24.04 dianjurkan), Docker engine **di DALAM WSL** (bukan Docker Desktop).
  - Cek: `docker version` jalan di dalam WSL, bukan di PowerShell.
  - WSL dimatikan dari Windows kapan pun: `wsl --shutdown` (jangan matikan lewat "kill terminal").
- **JANGAN pernah** build/up dari direktori `/mnt/c/...` (9p = sangat lambat, context walk ~1GB).
  Repo kerja WAJIB berada di filesystem ext4 WSL, contoh `/home/<user>/project-ppdb`.
- `.wslconfig` Windows yang terbukti stabil (opsional tapi disarankan):

  ```ini
  [wsl2]
  guiApplications=false
  memory=3GB
  processors=2
  swap=4GB

  [experimental]
  autoMemoryReclaim=gradual
  ```

  > ⚠️ **JANGAN pasang `networkingMode=mirrored`.** Sudah diuji: bentrok dengan publish port Docker
  > (browser tidak bisa akses, port container tidak ter-forward). Setup valid 100% memakai mode NAT bawaan WSL.
  > Akses dari browser Windows dilakukan via **IP VM WSL** (lihat Verifikasi).

- MySQL target: bisa produksi (mis. `srv1322.hstgr.io`, creds di `.env` yang diberikan owner) atau lokal.

## 3. Aturan (Non-Negotiable)

| # | Aturan | Alasan (dari bug nyata) |
|---|---|---|
| 1 | Env file dibuat dari template: `apps/api/.env` ← `.env.example`, `apps/whatsapp/.env` ← `.env.example`. **Jangan commit `.env`.** | Semua `.env` di-gitignore; stack tidak bisa jalan tanpa ini. |
| 2 | `docker-compose.yml`: ruas `dns: [8.8.8.8, 1.1.1.1]` di service `api` dan `whatsapp` **jangan dihapus**. | Resolver WSL (`10.255.255.254`) gagal menjawab query dari bridge Docker ("Temporary failure in name resolution" → api exit-loop, DB Hostinger unreachable). |
| 3 | `redis` command **wajib** `--maxmemory-policy noeviction`. | BullMQ memaksa noeviction; `allkeys-lru` memunculkan warning fatal di log whatsapp. |
| 4 | `apps/whatsapp/.env`: **`CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`**. | Image menginstal Chromium sistem; tanpa ini whatsapp-web.js gagal launch browser. |
| 5 | `apps/whatsapp/Dockerfile` **wajib** `useradd --system --create-home`. | Tanpa home dir: Chromium crash "Failed to create headless user data directory container". |
| 6 | `SessionManager.ts` puppeteer args **wajib** mengandung `--disable-crash-reporter`. | Container minimal → `chrome_crashpad_handler: --database is required` crash-loop. |
| 7 | Akses browser Windows hanya via **IP VM WSL** (`http://<vm-ip>:3000` dst). `localhost` dari Windows TIDAK tembus ke container. | Mode NAT WSL; sudah diuji (mirrored gagal). |
| 8 | Jika Chromium error "The profile appears to be in use by another Chromium process", hapus symlink stale: `SingletonLock`, `SingletonCookie`, `SingletonSocket` di dalam volume `wa_session` lalu restart whatsapp. | Stale lock tersisa dari crash/kill × container recreate; lokasinya persist di volume. |

## 4. Langkah Setup (verbatim)

Ganti `<user>` dengan username WSL (contoh: `hugoedmoundo`).

```bash
# ── 1. Masuk WSL (dari PowerShell/CMD Windows)
wsl

# ── 2. Clone repo di filesystem ext4 (BUKAN /mnt/c)
cd ~
git clone <repo-url> project-ppdb
cd ~/project-ppdb

# ── 3. Env files
cp apps/api/.env.example apps/api/.env
cp apps/whatsapp/.env.example apps/whatsapp/.env
#   isi nilai sesuai sumber (DB creds, JWT_SECRET, API_KEY, WEBHOOK_SECRET, dll)
#   terutama: apps/whatsapp/.env → CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
#   WA_SERVICE_API_KEY & WA_WEBHOOK_SECRET di api/.env HARUS sama dengan API_KEY/WEBHOOK_SECRET whatsapp/.env

# ── 4. (opsional) phone/branding env frontend — set jika mau browasi dari IP VM:
#    {NEXT_PUBLIC,VITE}_API_URL default http://localhost:8080 di-bake saat build.
#    Untuk akses lintas WSL→Windows browser, tambahkan dua variable ini (lihat bagian 5):
#    export FRONTEND_VITE_API_URL=http://<vm-ip>:8080
#    export FRONTEND_NEXT_PUBLIC_API_URL=http://<vm-ip>:8080

# ── 5. Build + start SEMUA service (jalankan dari repo dir)
docker compose up -d --build

# ── 6. Tunggu sehat (healthcheck aktif)
docker compose ps
#   Semua service harus tercantum "healthy" (api + whatsapp butuh waktu beberapa detik/menit).

# ── 7. Scan WhatsApp QR (SESI SEKALI SAJA, setelah itu tersimpan di volume wa_session)
#   Buka panel Superadmin di browser → menu WhatsApp → tampil QR (render via qr JS).
#   Alternatif CLI (verifikasi saja):
#   API_KEY=$(grep -E '^API_KEY=' apps/whatsapp/.env | cut -d= -f2-)
#   curl -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session            # → {"success":true,"data":{"status":"qr"}}
#   curl -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session/qr/raw     # → raw QR string
```

> Catatan build: `apps/api/Dockerfile` memakai mirror PyPI `mirrors.aliyun.com` + `--retries 10 --timeout 60`
> (cepat & stabil untuk wilayah Indonesia/Asia). Biarkan; jika di jaringan lain bermasalah, boleh ganti ke
> index resmi, TAPI pertahankan `--retries` & `--timeout` karena ganti itu bukan bagian setup inti.

## 5. Akses dari Browser Windows (penting!)

- Ambil IP VM WSL (bisa berubah tiap WSL restart):
  ```powershell
  wsl hostname -I   # output, misal: 172.19.242.40 ...
  ```
- Browser Windows: buka
  - `http://<vm-ip>:3000`  → Company Profile (Next.js)
  - `http://<vm-ip>:5173`  → PPDB App (Vite)
  - `http://<vm-ip>:5174`  → Superadmin (Vite)
  - `http://<vm-ip>:8080/health` → API FastAPI (harus 200)
- `localhost:8080` dari Windows adalah service Windows sendiri (bisa Apache/httpd lain) — **BUKAN api kita**.
- Agar bundle frontend memanggil API yang benar, set `FRONTEND_VITE_API_URL`/`FRONTEND_NEXT_PUBLIC_API_URL`
  ke `http://<vm-ip>:8080` **SEBELUM build** (langkah 4). Jika hanya preview UI (tanpa integrasi API), default lokal cukup.

## 6. Verifikasi (WAJIB setelah setup)

```bash
# Di dalam WSL:
cd ~/project-ppdb
docker compose ps
#   semua "healthy"

# API benar-benar sehat & DNS jalan (bukti fix DNS bekerja):
docker exec project-ppdb-api-1 python3 -c "import socket; print(socket.gethostbyname('srv1322.hstgr.io'))"
#   → harus IP publik (bukan error)

curl -s http://127.0.0.1:8080/health; echo        # → api respond (isi json/ok)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000    # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173    # 200
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5174    # 200

# WhatsApp QR ready:
API_KEY=$(grep -E '^API_KEY=' apps/whatsapp/.env | cut -d= -f2-)
curl -s -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session

# Dari browser Windows:
#   http://<vm-ip>:3000 , :5173, :5174, dan :8080/health semuanya terbuka.
```

Setup dinyatakan **BERHASIL** jika kelima item di atas lolos DAN QR WhatsApp bisa discan dari Superadmin.

## 7. Operasional Harian

```bash
# Nyalain (dari dalam WSL, di folder repo):
docker compose up -d

# Matiin container saja (port dibebaskan, dockerd tetap jalan, balik cepat):
docker compose stop

# Matiin total (dockerd + VM, 0 proses/port — aman saat ganti project yang pakai port sama):
#   Dari PowerShell Windows:
wsl --shutdown

# Lihat log:
docker compose logs -f api          # FastAPI
docker compose logs -f whatsapp     # WhatsApp session/QR
```

## 8. Troubleshooting Ringkas

| Gejala | Penyebab | Solusi |
|---|---|---|
| api unhealthy / restart loop, log `2003 ... Temporary failure in name resolution` | DNS WSL gagal dari bridge | Pastikan ruas `dns: 8.8.8.8` ada di service api/whatsapp (aturan #2). Recreate: `docker compose up -d api whatsapp` |
| whatsapp log: `Could not find Chrome` | `CHROMIUM_EXECUTABLE_PATH` kosong | Set `/usr/bin/chromium` di `apps/whatsapp/.env` (aturan #4), recreate. |
| whatsapp: `Failed to create headless user data directory container` | Home dir user tidak ada | Pastikan `useradd --create-home` di Dockerfile whatsapp (aturan #5), rebuild image. |
| whatsapp: `chrome_crashpad_handler: --database is required` | Container minim | Pastikan `--disable-crash-reporter` ada di puppeteer args (aturan #6). |
| whatsapp: `profile appears to be in use by another Chromium process (...)` | Stale Singleton lock di volume | `docker exec project-ppdb-whatsapp-1 sh -c 'rm -f /app/wa-session/session-*/Singleton*; rm -rf /tmp/org.chromium.Chromium.*'` lalu `docker compose restart whatsapp` |
| whatsapp: `IMPORTANT! Eviction policy is allkeys-lru...` | Redis policy salah | Pastikan `--maxmemory-policy noeviction` (aturan #3), recreate redis |
| Browser Windows tidak bisa buka `localhost:3000` | Mode NAT WSL | Gunakan IP VM (`wsl hostname -I`), bukan `localhost` (aturan #7) |
| `docker compose up` sempat gagal lalu `wsl: connection failed 0x8007274c` | Koneksi WSL transient | Retry sebentar (bukan masalah repo) |
