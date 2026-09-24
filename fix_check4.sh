#!/bin/bash
cd /root/project-ppdb
VMIP=$(hostname -I | awk '{print $1}')
echo "vm_ip=$VMIP"
echo '=== api from vm-IP (what browser hits) ==='
curl -s -m 12 -o /dev/null -w "api /health vm => %{http_code}\n" http://$VMIP:8080/health
echo '=== migration head ==='
docker compose exec -T api alembic current 2>&1 | tail -2
echo '=== whatsapp QR raw (should return a QR string, not crash) ==='
docker compose exec -T whatsapp sh -c 'curl -s -m 25 -H "X-API-Key: '\''$API_KEY'\''" "http://127.0.0.1:3100/api/session/qr/raw" | head -c 160'; echo
echo '=== whatsapp session status (via api: wa service status) ==='
curl -s -m 12 -H "Origin: http://$VMIP:5174" http://$VMIP:8080/api/health/whatsapp 2>/dev/null | head -c 200; echo
echo '=== final docker stats (one line each) ==='
docker stats --no-stream --format '{{.Name}}: CPU {{.CPUPerc}} MEM {{.MemUsage}}' 2>/dev/null | grep -v -E '^$'
