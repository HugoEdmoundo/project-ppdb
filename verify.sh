#!/bin/bash
cd /root/project-ppdb
echo '=== compose ps ==='
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
echo
echo '=== host curl via bridge (docker0 net) ==='
curl -s -o /dev/null -w 'bridge registry.npmjs.org: %{http_code} %{time_total}s\n' -m 60 https://registry.npmjs.org
echo
echo '=== container DNS check (whatsapp runtime) ==='
docker exec project-ppdb-whatsapp-1 sh -c 'getent hosts registry.npmjs.org | head -1; ls -1 /usr/bin/chromium 2>&1'
echo
echo '=== whatsapp health ==='
docker exec project-ppdb-whatsapp-1 sh -c 'curl -s http://localhost:3100/health; echo; curl -s http://localhost:3100/api/session-status' 2>&1 | head -5
echo
echo '=== API health (container) ==='
docker exec project-ppdb-api-1 sh -c 'curl -s http://localhost:8000/health; echo' 2>&1 | head -6
echo
echo '=== API health (host NAT) ==='
curl -s -o /dev/null -w 'host:8080 %{http_code}\n' -m 15 http://127.0.0.1:8080/health
echo
echo '=== frontend (host NAT) ==='
curl -s -o /dev/null -w 'frontend:3000 %{http_code}\n' -m 15 http://127.0.0.1:3000
curl -s -o /dev/null -w 'frontend:5173 %{http_code}\n' -m 15 http://127.0.0.1:5173
curl -s -o /dev/null -w 'frontend:5174 %{http_code}\n' -m 15 http://127.0.0.1:5174
