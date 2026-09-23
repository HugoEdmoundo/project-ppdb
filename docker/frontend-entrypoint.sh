#!/bin/bash
# ============================================================
# PTDARRAHMAN — Frontend container entrypoint
# Menjalankan 3 buah UI (hanya menyajikan UI, tanpa backend):
#   :3000  companyprofile (Next.js)
#   :5173  ppdb            (Vite preview)
#   :5174  superadmin      (Vite preview)
# ============================================================
set -euo pipefail

echo "──────────────────────────────────────────────"
echo " PTDARRAHMAN — Frontend container (UI only)"
echo "   companyprofile : http://0.0.0.0:3000"
echo "   ppdb           : http://0.0.0.0:5173"
echo "   superadmin     : http://0.0.0.0:5174"
echo "──────────────────────────────────────────────"

cd /workspace/apps/companyprofile
node node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000 &
PID_NEXT=$!
echo "[frontend] companyprofile (Next.js) → :3000 (pid $PID_NEXT)"

cd /workspace/apps/ppdb
node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 5173 &
PID_PPDB=$!
echo "[frontend] ppdb → :5173 (pid $PID_PPDB)"

cd /workspace/apps/superadmin
node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port 5174 &
PID_SUPER=$!
echo "[frontend] superadmin → :5174 (pid $PID_SUPER)"

# Tunggu proses pertama yang berhenti. Jika ada yang crash, seluruh container berhenti
# (sinyal ke orkestrator untuk restart), agar UI tidak tampil separuh-separuh.
wait -n "$PID_NEXT" "$PID_PPDB" "$PID_SUPER"
exit_code=$?
echo "[frontend] Salah satu proses berhenti (exit $exit_code) — mematikan container."
kill "$PID_NEXT" "$PID_PPDB" "$PID_SUPER" 2>/dev/null || true
exit $exit_code
