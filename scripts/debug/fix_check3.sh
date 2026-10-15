#!/bin/bash
cd /root/project-ppdb
echo '=== compose ps ==='
docker compose ps --format 'table {{.Name}}\t{{.Status}}'
echo '=== host-NAT ports (what Windows browser hits: api, whatsapp) ==='
for p in 8080 3100; do curl -s -m 12 -o /dev/null -w "nat $p => %{http_code}\n" http://127.0.0.1:$p; done
echo '=== vm-ip check (fake browser origin) ==='
VMIP=$(hostname -I | awk '{print $1}')
for p in 3000 5173 5174; do curl -s -m 12 -o /dev/null -w "vm $p => %{http_code}\n" http://$VMIP:$p; done
echo '=== blocked-check: can whatsapp talk to api webhook? (api sees wa call) ==='
docker compose logs --tail 3 api 2>&1 | tail -3
echo '=== what frontend serves? (should be Next landing 3000 / ppdb 5173 / superadmin 5174) ==='
for p in 3000 5173 5174; do code=$(curl -s -m 12 -o /dev/null -w '%{http_code}' http://$VMIP:$p); echo "$p => $code"; done
echo '=== whatsapp: report QR as connected? ==='
docker compose logs --tail 12 whatsapp 2>&1 | tail -12
