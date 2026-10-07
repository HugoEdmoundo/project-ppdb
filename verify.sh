#!/usr/bin/env bash
set -e

REPO_DIR="$HOME/project-ppdb"
cd "$REPO_DIR"

echo "=== 1. docker compose ps ==="
docker compose ps

echo
echo "=== 2. DNS resolution in API container ==="
docker exec project-ppdb-api-1 python3 -c "import socket; print('srv1322.hstgr.io ->', socket.gethostbyname('srv1322.hstgr.io'))"

echo
echo "=== 3. API Health (host NAT :8080) ==="
curl -s http://127.0.0.1:8080/health
echo

echo
echo "=== 4. Frontend HTTP status codes ==="
echo -n "Port 3000 (Company Profile): "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000
echo -n "Port 5173 (PPDB App): "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173
echo -n "Port 5174 (Superadmin): "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5174

echo
echo "=== 5. WhatsApp API Session ==="
API_KEY=$(grep -E '^API_KEY=' apps/whatsapp/.env | cut -d= -f2-)
curl -s -H "X-API-Key: $API_KEY" http://127.0.0.1:3100/api/session
echo

echo
echo "=== 6. Alembic Current vs Heads ==="
docker compose exec -T api alembic current
docker compose exec -T api alembic heads
