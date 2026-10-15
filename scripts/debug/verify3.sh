#!/bin/bash
cd /root/project-ppdb
echo '=== compose ps ==='
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
echo
echo '=== ports via NAT host ==='
for p in 8080 3000 5173 5174; do curl -s -m 15 -o /dev/null -w "$p:%{http_code} " http://127.0.0.1:$p; done
echo
echo '=== whatsapp session via api (QR status) ==='
curl -s -m 15 -H "X-API-Key: dev-change-me-9f4c2e7a1b8d3f5a6c9e0b2d4f8a1c3e" http://127.0.0.1:8080/api/whatsapp/session | head -c 400; echo
echo
echo '=== whatsapp health from inside wa container ==='
docker exec project-ppdb-whatsapp-1 sh -c 'curl -s http://localhost:3100/health' 2>/dev/null || echo NA
echo
echo '=== chromium present ==='
docker exec project-ppdb-whatsapp-1 sh -c 'which chromium'
echo
echo '=== whatsapp recent log ==='
docker compose logs --tail 10 whatsapp 2>&1
