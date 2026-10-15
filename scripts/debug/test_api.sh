TOKEN=$(curl -s -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"SuperAdmin123!."}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Token: "
curl -s -X POST http://localhost:8080/notifications/send -H "Authorization: Bearer " -H 'Content-Type: application/json' -d '{"recipient_user_ids":["dummy"],"channel":"whatsapp","subject":"Test","body":"Test dari AI"}'
