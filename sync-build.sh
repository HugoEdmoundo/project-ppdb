#!/usr/bin/env bash
#
# sync-build.sh — Satu perintah untuk: sync Windows -> WSL + build + start.
# Edit kode di copy Windows, lalu jalankan dari PowerShell:
#   wsl -e bash /mnt/c/ptdarrahman.sch.id/project-ppdb/sync-build.sh
# (fasta: sewaktu-waktu cukup jalankan satu perintah ini, ga perlu tanya siapa-siapa)
# ============================================================
set -euo pipefail

SRC="/mnt/c/ptdarrahman.sch.id/project-ppdb"
DST="$HOME/project-ppdb"

if [ ! -d "$SRC" ]; then
  echo "ERROR: copy Windows tidak ketemu: $SRC" >&2
  exit 1
fi
if [ ! -d "$DST" ]; then
  echo "ERROR: copy WSL tidak ketemu: $DST" >&2
  exit 1
fi

echo "[1/3] Sync Windows -> WSL ..."
rsync -a --delete \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.mypy_cache' \
  --exclude='.ruff_cache' \
  --exclude='.pytest_cache' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='*.tsbuildinfo' \
  --exclude='uploads' \
  "$SRC/" "$DST/"
echo "   Sync selesai."

echo "[2/3] Pastikan Docker jalan ..."
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

echo "[3/3] Build + start (docker compose up -d --build) ..."
cd "$DST"
docker compose up -d --build

echo ""
echo "DONE. Cek status:  docker compose ps"
