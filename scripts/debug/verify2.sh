#!/bin/bash
cd /root/project-ppdb
echo '=== compose ps ==='
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
echo
echo '=== API health (NAT host 127.0.0.1:8080) ==='
curl -s -m 12 http://127.0.0.1:8080/health; echo
echo
echo '=== API resolusi DB dari container api ==='
docker exec project-ppdb-frontend-1 sh -c 'date' >/dev/null 2>&1
docker compose exec -T api python3 -c "import socket; print('DB_IP:', socket.gethostbyname('srv1322.hstgr.io'))" 2>&1 | head -1
echo
echo '=== CORS dari Windows browser origin (vm-ip) ==='
curl -s -m 12 -o /dev/null -w 'api health w/ Origin 192.168.1.48:5173 => %{http_code}\n' -H 'Origin: http://192.168.1.48:5173' http://127.0.0.1:8080/health
echo
echo '=== frontend URLs ==='
for u in 3000 5173 5174; do curl -s -m 10 -o /dev/null -w "frontend:$u => %{http_code}\n" http://127.0.0.1:$u; done
echo
echo '=== whatsapp session + QR ==='
docker compose exec -T whatsapp node -e "const http=require('http');http.get('http://localhost:3100/api/session',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log('session:',d.slice(0,220)))}).on('error',e=>console.log('ERR',e.message))"
echo
echo '=== whatsapp chromium? ==='
docker compose exec -T whatsapp which chromium 2>&1 | head -1
echo
echo '=== recent whatsapp log ==='
docker compose logs --tail 8 whatsapp 2>&1
