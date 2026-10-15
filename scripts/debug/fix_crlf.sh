#!/bin/bash
set -e
cd /root/project-ppdb

echo '=== files with CRLF among tracked .sh ==='
git ls-files '*.sh' | while read -r f; do
  if [ -f "$f" ] && grep -qU $'\r' "$f"; then
    echo "FIX $f"
    sed -i 's/\r$//' "$f"
  fi
done

echo '=== verify frontend entrypoint ==='
grep -nU $'\r' docker/frontend-entrypoint.sh && echo STILL_CRLF || echo 'LF OK'
od -An -c -N12 docker/frontend-entrypoint.sh | head -1

echo '=== whatsapp entrypoint? (Whatsapp pakai CMD node, bukan script) ==='
grep -rn 'entrypoint' apps/whatsapp/Dockerfile | head

echo '=== rebuild frontend (dos2unix applied) ==='
docker compose build frontend 2>&1 | tail -4
