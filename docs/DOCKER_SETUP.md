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
- `.wslconfig` Windows berikut **WAJIB dipasang** di mesin yang dipakai owner — ini yang membuat
  runtime TIDAK mati sendiri. File ini **machine-global** (mempengaruhi seluruh WSL di satu Windows):

  ```ini
  [general]
  # Nonaktifkan idle-terminate di LEVEL DISTRO. Tanpa ini, WSL mematikan distro
  # beberapa detik setelah tidak ada sesi wsl.exe → dockerd & container mati sendiri.
  # Nilai NEGATIF = never. (Pernah dicoba 2147483647, TIDAK bekerja — terbukti.)
  instanceIdleTimeout=-1

  [wsl2]
  guiApplications=false
  memory=3GB          # boleh sesuaikan kapasitas mesin; batas project diatur mem_limit di compose
  processors=2
  swap=4GB
  # Nonaktifkan idle-terminate di LEVEL VM. WAJIB berpasangan dengan
  # instanceIdleTimeout di atas — hanya dengan dua-duanya VM bertahan walau semua
  # terminal ditutup (Docker tetap jalan). VM baru mati saat `wsl --shutdown`.
  vmIdleTimeout=-1

  [experimental]
  autoMemoryReclaim=gradual
  ```

  > **Kenapa WAJIB (bug nyata):** dengan `docker compose up` "4/4 healthy", VM tetap mati sendiri
  > dalam ~70 detik begitu tidak ada sesi `wsl.exe` — dockerd ikut mati. `vmIdleTimeout` SAJA tidak
  > cukup; kombinasi `[general] instanceIdleTimeout=-1` + `[wsl2] vmIdleTimeout=-1` terbukti membuat
  > VM bertahan (diuji idle 80+ detik, tetap `Running`). Nilai `2147483647` pada `vmIdleTimeout`
  > juga TERBUKTI tidak menahan distro — gunakan `-1`.

  > Konfigurasi ini **machine-global** (membatasi seluruh WSL di laptop itu). Batasan RAM **khusus
  > project ini** dibawa sendiri oleh repo melalui `mem_limit` per-container di `docker-compose.yml`
  > (frontend 512m, api 512m, whatsapp 768m, redis 256m) — cukup jalankan `docker compose up -d`.
  > Topologi total ~2GB → ringan & aman berdampingan dengan project lain.

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
| 9 | `.wslconfig` HARUS memuat `[general] instanceIdleTimeout=-1` DAN `[wsl2] vmIdleTimeout=-1` (nilai negatif = never). | Tanpa pasangan ini, VM/distro WSL mati sendiri ~70 detik setelah sesi `wsl.exe` terakhir ditutup → dockerd & semua container ikut mati. `vmIdleTimeout` saja atau nilai `2147483647` TIDAK cukup (terbukti di mesin owner). |
| 10 | `docker.service`, `containerd.service`, `docker.socket` sengaja di-SET `disabled` (manual-start). Setelah boot / `wsl --shutdown`, WAJIB `sudo systemctl start docker` dulu. | Owner MENOLAK auto-start saat boot WSL (mau kontrol manual penuh, bukan karena proses laptop idle). Kalau dinyalakan otomatis, dockerd ikut menyala setiap WSL boot. |
| 11 | Update kode = **sync ke copy WSL dulu, LALU `docker compose up -d --build`**. `up -d` TANPA `--build` TIDAK menerapkan perubahan. | Frontend & API di-bake ke image saat build (bukan bind-mount live). Tanpa `--build`, container tetap pakai image lama yang sudah ada. `--build` sekali jalan = build + recreate + start, tidak perlu `up -d` lagi. |
| 12 | `/etc/docker/daemon.json` **wajib** memuat `{"dns": ["8.8.8.8", "1.1.1.1"]}`. | Saat `docker build` (BuildKit), build container TIDAK memakai konfigurasi `dns` dari `docker-compose.yml`, melainkan mewarisi `/etc/resolv.conf` host WSL (`10.255.255.254`) yang sering drop → `pip install` / `npm ci` / `apt-get` gagal dengan `Temporary failure in name resolution` atau timeout download wheel. |
| 13 | Redis: `vm.overcommit_memory=1` **wajib** aktif, dipasang lewat `/etc/sysctl.d/99-ptdarrahman-redis.conf`. | Tanpa itu Redis boot dengan `WARNING Memory overcommit must be enabled!`; fork-based BGSAVE/AOF rewrite bisa GAGAL saat memori rendah sehingga RDB/AOF korup dan queue BullMQ hilang. |
| 14 | Redis `--maxmemory` (192mb) **harus lebih kecil** dari `mem_limit` container (256m). | Kalau sama, cgroup OOM-kill duluan sehingga Redis tidak pernah sampai ke `--maxmemory-policy noeviction` dan tidak shutdown bersih. Sisakan ruang untuk overhead, AOF buffer, dan fork child. |
| 15 | `/etc/sudoers.d/ptdarrahman-docker` **wajib ada** (NOPASSWD hanya untuk `systemctl` docker/containerd). | Tanpa itu `wsl -e sudo systemctl start docker` (bagian 7) menggantung menunggu password — pada sesi non-interaktif (script/agent/task scheduler) container tidak pernah hidup. Cakupanrule sengaja sempit; `sudo` lain tetap minta password. |

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

# ── 5. Docker daemon DNS (aturan #12) & MANUAL-START (aturan #10):
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
# Redis fork-based save butuh overcommit (aturan #13). systemd-sysctl
# membacanya tiap WSL boot karena [boot] systemd=true di /etc/wsl.conf.
sudo tee /etc/sysctl.d/99-ptdarrahman-redis.conf > /dev/null << 'EOF'
vm.overcommit_memory = 1
EOF
sudo sysctl --system
# NOPASSWD untuk systemctl docker/containerd saja (aturan #15) supaya
# `wsl -e sudo systemctl start docker` tidak hang menunggu password.
sudo tee /etc/sudoers.d/ptdarrahman-docker > /dev/null << 'EOF'
hugoedmoundo ALL=(root) NOPASSWD: /usr/bin/systemctl start docker, /usr/bin/systemctl stop docker, /usr/bin/systemctl restart docker, /usr/bin/systemctl status docker, /usr/bin/systemctl start docker.service, /usr/bin/systemctl stop docker.service, /usr/bin/systemctl restart docker.service, /usr/bin/systemctl status docker.service, /usr/bin/systemctl start docker.socket, /usr/bin/systemctl stop docker.socket, /usr/bin/systemctl start containerd, /usr/bin/systemctl start containerd.service, /usr/bin/systemctl restart containerd.service
EOF
sudo chmod 0440 /etc/sudoers.d/ptdarrahman-docker
sudo visudo -c          # WAJIB: pastikan "parsed OK" sebelum lanjut
sudo systemctl disable docker.service containerd.service docker.socket
sudo systemctl start docker            # setiap habis boot / wsl --shutdown

# ── 6. Build + start SEMUA service (jalankan dari repo dir)
docker compose up -d --build           # SEKALI saja cukup = build + recreate + start

# ── 7. Tunggu sehat (healthcheck aktif)
docker compose ps
#   Semua service harus tercantum "healthy" (api + whatsapp butuh waktu beberapa detik/menit).

# ── 8. Scan WhatsApp QR (SESI SEKALI SAJA, setelah itu tersimpan di volume wa_session)
#   Buka panel Superadmin di browser → menu WhatsApp → tampil QR (render via qr JS).
#   Alternatif CLI (verifikasi saja):
#   API_KEY=$(grep -E '^API_KEY=' apps/whatsapp/.env | cut -d= -f2-)
#   curl -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session            # → {"success":true,"data":{"status":"qr"}}
#   curl -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session/qr/raw     # → raw QR string
```

> Catatan build: `apps/api/Dockerfile` memakai mirror PyPI `mirrors.aliyun.com` + `--retries 10 --timeout 60`
> (cepat & stabil untuk wilayah Indonesia/Asia). Biarkan; jika di jaringan lain bermasalah, boleh ganti ke
> index resmi, TAPI pertahankan `--retries` & `--timeout` karena ganti itu bukan bagian setup inti.

## 4a. DUA COPY REPO (kunci masalah "ga update") — WAJIB paham

Setup nyata owner memakai **dua copy repo**, dan ini sumber kebingungan paling sering:

| Copy | Lokasi | Git? | Dipakai untuk |
|---|---|---|---|
| **Copy Windows** | `C:\ptdarrahman.sch.id\project-ppdb` | **YA** (repo asli, tempat AGENT/opencode & editor bekerja) | edit kode, commit |
| **Copy WSL** | `/home/<user>/project-ppdb` (ext4) | TIDAK (tanpa .git, bisa stale) | **Docker build & run** (satu-satunya yang dipakai dockerd) |

**ALUR UPDATE KODE yang benar:**
1. Edit di **copy Windows** (git repo, tempat agent bekerja).
2. **Sync file yang berubah ke copy WSL** (jalankan dari dalam WSL), contoh:
   ```bash
   cp /mnt/c/ptdarrahman.sch.id/project-ppdb/apps/api/src/modules/companyprofile/router.py \
      /home/<user>/project-ppdb/apps/api/src/modules/companyprofile/router.py
   ```
   (opsional: sync seluruh `apps/` & `packages/` via `rsync`, tapi JANGAN timpa `.env`).
   **WAJIB cek file yang hilang, bukan cuma file yang berubah** — copy WSL bisa
   kekurangan file yang sifatnya BARU di Windows (untracked di git), terutama
   `apps/api/alembic/versions/*.py`. Gejalanya: api crash-loop
   `Can't locate revision identified by '00XX'`. Cek cepat dari dalam WSL:
   ```bash
   cd /home/<user>/project-ppdb
   git -C /mnt/c/ptdarrahman.sch.id/project-ppdb status --porcelain -- apps/api/alembic/versions/
   ls -1 apps/api/alembic/versions/            # bandingkan dengan output di atas
   ```
   `??` = file baru di Windows yang belum ada di WSL → wajib di-`cp`.
3. Build ulang & jalankan dari **copy WSL** (aturan #11):
   ```bash
   cd /home/<user>/project-ppdb
   docker compose up -d --build
   ```
4. Tanpa perubahan kode cukup: `docker compose up -d` (pakai image lama).

> **Gejala khas kalau salah urutan:** kode sudah diedit di Windows + `up -d --build` dijalankan,
> tapi UI/API tetap versi lama. Penyebab: yang di-build adalah **copy WSL yang belum di-sync**.
> Ingat: dockerd HANYA melihat `/home/<user>/project-ppdb`, TIDAK pernah melihat `C:\...`.

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
# NYALAIN setiap habis WSL boot (dockerd MANUAL-START — aturan #10; jalankan dari PowerShell):
wsl -e sudo systemctl start docker
# lalu (dari dalam WSL, di folder repo copy WSL):
docker compose up -d                 # tanpa perubahan kode
# atau kalau ada update kode (setelah sync dari copy Windows — lihat 4a):
docker compose up -d --build         # SEKALI cukup

# Matiin container saja (port dibebaskan, dockerd tetap jalan, balik cepat):
docker compose stop

# Matiin total (dockerd + VM, 0 proses/port — aman saat ganti project yang pakai port sama):
#   Dari PowerShell Windows:
wsl --shutdown

# Lihat log:
docker compose logs -f api          # FastAPI
docker compose logs -f whatsapp     # WhatsApp session/QR
```

> ⚠️ Karena `.wslconfig` memakai `instanceIdleTimeout=-1`/`vmIdleTimeout=-1` (aturan #9),
> VM TIDAK akan mati sendiri walau laptop idle — untuk benar-benar mematikan total, WAJIB
> `wsl --shutdown` manual.

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
| **Semua container berhenti tiba-tiba, `wsl -l -v` → `Stopped`** walau tidak `docker compose stop` | VM WSL auto-shutdown karena idle | Pastikan `.wslconfig` punya `instanceIdleTimeout=-1` + `vmIdleTimeout=-1` (aturan #9). Setelah boot lagi jangan lupa `sudo systemctl start docker`. |
| **Kode sudah diedit tapi build/output tetap versi lama ("ga update")** | (a) Build dari copy WSL yang belum di-sync dari copy Windows, dan/atau (b) `up -d` tanpa `--build` | Sync file ke `/home/<user>/project-ppdb` dulu (bagian 4a), lalu `docker compose up -d --build` (aturan #11). |
| `docker build` pip install / npm ci gagal `Temporary failure in name resolution` atau `ReadTimeoutError` | Build container mewarisi resolver host WSL (10.255.255.254) | Buat `/etc/docker/daemon.json` berisi `{"dns": ["8.8.8.8", "1.1.1.1"]}` (aturan #12) lalu `sudo systemctl restart docker`. |
| **redis log: `WARNING Memory overcommit must be enabled!`** | `vm.overcommit_memory=0` | Buat `/etc/sysctl.d/99-ptdarrahman-redis.conf` berisi `vm.overcommit_memory = 1` lalu `sudo sysctl --system` (aturan #13). Restart redis. |
| **redis mati sendiri / `OOMKilled`, queue BullMQ kosong** | `--maxmemory` = `mem_limit` container | `--maxmemory` harus < `mem_limit`; sekarang 192mb vs 256m (aturan #14). `docker compose up -d --build redis`. |
| **`wsl -e sudo systemctl start docker` menggantung / tidak ada output** | `sudo` menunggu password di sesi non-interaktif | Pasang `/etc/sudoers.d/ptdarrahman-docker` (aturan #15) lalu `sudo visudo -c`. Alternatif: `wsl -d Ubuntu -u root -- systemctl start docker`. |
| **whatsapp log: `[ioredis] Unhandled error event: ... ECONNREFUSED`** lalu container crash | Koneksi BullMQ dibuat tanpa handler `error`; ioredis melempar error event tanpa listener → proses mati | `createRedisConnection()` di `apps/whatsapp/src/lib/redis.ts` sudah attach handler. Kalau muncul lagi setelah edit: sync ke copy WSL lalu `docker compose up -d --build whatsapp`. |
| **whatsapp `docker compose stop` selalu 30s lalu "Force exiting"** | Koneksi BullMQ tidak ditutup saat shutdown | Queue/queueEvents harus selalu di-`close()` di `server.ts` shutdown (bukan hanya saat `redisReady`). Sudah diperbaiki. |
| **api crash-loop: `Can't locate revision identified by '0024'` lalu `dependency failed to start: container project-ppdb-api-1 is unhealthy`** | Copy build WSL (/home/hugoedmoundo) KURANG BANYAK dari Windows (C:\ptdarrahman.sch.id) — file migrasi `0023`/`0024` ada di Windows tapi belum tersinkron. DB sudah ter-stamp `0024`, jadi Alembic tidak bisa resolve chain dan exit. | Copy file yang kurang dari Windows ke WSL (lihat "Sync Source Windows → WSL" di bawah), lalu `docker compose up -d --build api`. Verifikasi: `docker compose exec -T api alembic current` harus cocok dengan `alembic heads`. |
| **whatsapp log ~15-20 baris `Redis error` / `ECONNREFUSED` / `ENOTFOUND redis` tepat setelah boot** | `restart: unless-stopped` menyalakan SEMUA container paralel saat dockerd start, jadi `depends_on: service_healthy` TIDAK berlaku — BullMQ connect sebelum redis listen. Self-heals dalam ~8 detik. | Sudah di-downgrade ke `warn` di `lib/redis.ts` (hanya error SEJAK koneksi pernah `ready` yang di-`error`). Kalau muncul lagi: file WSL belum ter-sync/rebuild. |
| `socket.gaierror` / API hang saat dipanggil karena koneksi DB | Panggilan DB blocking di event loop | Endpoint async jangan memanggil DB sinkron langsung; pakai `asyncio.to_thread` atau jadikan endpoint `def` (lihat fix `apps/api/src/modules/companyprofile/router.py`). |
| API log: `pymysql ... socket.readinto` / event loop blocked, `/health` lambat | `connect_timeout`/`read_timeout` tidak diset | Pastikan engine `connect_args` memuat `connect_timeout=5, read_timeout=30, write_timeout=30` (`apps/api/src/core/database.py`). |

## 9. Pindah Device / Setup di Mesin Baru (reproduksi 1:1)

Kalau owner pindah laptop/PC, agar perilaku runtime PERSIS seperti sekarang (manual-start + tidak
mati sendiri + dua-copy repo), ikuti urutan ini:

1. **Instal Windows + WSL2 Ubuntu.** Cek: `wsl --version` (WSL 2.5.x+ mendukung
   `instanceIdleTimeout` — versi lama mengabaikan section `[general]`).
2. **Buat `.wslconfig`** di `%USERPROFILE%\.wslconfig` dengan konten dari bagian 2 (termasuk
   `[general] instanceIdleTimeout=-1`). Jalankan `wsl --shutdown` + `wsl` sekali agar diterapkan.
3. **Clone repo git di copy Windows** (`C:\ptdarrahman.sch.id\project-ppdb`) SEMALAMAN
   **buat copy kerja WSL** di `/home/<user>/project-ppdb` (ext4). Cara tercepat:
   `cp -a /mnt/c/ptdarrahman.sch.id/project-ppdb /home/<user>/project-ppdb` dari dalam WSL,
   lalu hapus folder `.git` di copy WSL agar tidak ada dua git yang saling bingung.
4. **Env files**: `cp apps/api/.env.example apps/api/.env`, `cp apps/whatsapp/.env.example
   apps/whatsapp/.env`, lalu isi dengan nilai yang benar (creds DB, JWT, API key, WEBHOOK secret).
   Set `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` di whatsapp/.env.
5. **Docker daemon DNS & Manual-start (aturan #10, #12, #13, #15)**:
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
   {
     "dns": ["8.8.8.8", "1.1.1.1"]
   }
   EOF
   sudo tee /etc/sysctl.d/99-ptdarrahman-redis.conf > /dev/null << 'EOF'
   vm.overcommit_memory = 1
   EOF
   sudo sysctl --system
   sudo tee /etc/sudoers.d/ptdarrahman-docker > /dev/null << 'EOF'
   hugoedmoundo ALL=(root) NOPASSWD: /usr/bin/systemctl start docker, /usr/bin/systemctl stop docker, /usr/bin/systemctl restart docker, /usr/bin/systemctl status docker, /usr/bin/systemctl start docker.service, /usr/bin/systemctl stop docker.service, /usr/bin/systemctl restart docker.service, /usr/bin/systemctl status docker.service, /usr/bin/systemctl start docker.socket, /usr/bin/systemctl stop docker.socket, /usr/bin/systemctl start containerd, /usr/bin/systemctl start containerd.service, /usr/bin/systemctl restart containerd.service
   EOF
   sudo chmod 0440 /etc/sudoers.d/ptdarrahman-docker
   sudo visudo -c
   sudo systemctl disable docker.service containerd.service docker.socket
   ```
6. Build & jalankan: `sudo systemctl start docker` lalu `docker compose up -d --build`.
7. Verifikasi lengkap (bagian 6) + scan QR WhatsApp dari Superadmin.

> Setelah mesin baru aktif: selama bertahun-tahun rutinitas cuma 3 perintah —
> `wsl -e sudo systemctl start docker` → `docker compose up -d` (tanpa perubahan) /
> `docker compose up -d --build` (setelah sync kode per bagian 4a) → matikan `wsl --shutdown`.
