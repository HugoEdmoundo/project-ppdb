#!/usr/bin/env bash
#
# sync-build.sh — Satu perintah untuk: sync Windows -> WSL + build + start.
# Edit kode di copy Windows, lalu jalankan dari PowerShell:
#   wsl -e bash /mnt/c/Users/farre/project-ppdb/sync-build.sh
# (fasta: sewaktu-waktu cukup jalankan satu perintah ini, ga perlu tanya siapa-siapa)
# ============================================================
set -euo pipefail

# SRC = folder tempat script ini berada (copy Windows, repo git asli).
# DST = copy WSL di ext4, satu-satunya yang dilihat dockerd.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DST="${DST_DIR:-$HOME/project-ppdb}"

if [ ! -d "$SRC" ]; then
  echo "ERROR: copy Windows tidak ketemu: $SRC" >&2
  exit 1
fi
if [ ! -d "$DST" ]; then
  echo "ERROR: copy WSL tidak ketemu: $DST" >&2
  exit 1
fi

echo "[1/4] Sync Windows -> WSL ($SRC -> $DST) ..."
rsync -a --delete \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.pnpm-store' \
  --exclude='.turbo' \
  --exclude='.venv' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='.pytest_cache' \
  --exclude='.next' \
  --exclude='.turbo' \
  --exclude='.eslintcache' \
  --exclude='dist' \
  --exclude='*.tsbuildinfo' \
  --exclude='uploads' \
  --exclude='wa-session' \
  --exclude='wa_logs' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  "$SRC/" "$DST/"
echo "   Sync selesai."

# Copy Windows menyimpan file dengan CRLF. Shell script / Dockerfile / compose
# yang CRLF akan menggagalkan build & start container (sh: \r: command not found).
echo "[2/4] Normalisasi line ending CRLF -> LF (script, Dockerfile, compose) ..."
find "$DST" \
  -path "$DST/node_modules" -prune -o \
  -path "$DST/.git" -prune -o \
  -path "$DST/.next" -prune -o \
  -path "$DST/dist" -prune -o \
  -type f \
  \( -name '*.sh' -o -name 'Dockerfile*' -o -name 'docker-compose*.yml' -o -name '*.yaml' -path '*/docker/*' \) \
  -print0 \
| xargs -0 -r -n 20 sed -i 's/\r$//'
echo "   Line ending dinormalkan."

echo "[3/4] Pastikan Docker jalan ..."
if ! docker info >/dev/null 2>&1; then
  echo "   Docker mati, nyalakan manual (aturan #10) ..."
  sudo systemctl start docker
  for _ in $(seq 1 15); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi
docker info >/dev/null 2>&1 || { echo "ERROR: Docker tidak bisa dinyalakan." >&2; exit 1; }
echo "   Docker OK."

echo "[4/4] Build + start (docker compose up -d --build) ..."
cd "$DST"
docker compose up -d --build

echo ""
echo "DONE. Cek status:  docker compose ps"
