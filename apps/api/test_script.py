import requests

token_res = requests.post(
    "http://localhost:8080/auth/login",
    json={"username": "superadmin", "password": "SuperAdmin123!."},
)
print(token_res.json())
if token_res.status_code == 200:
    token = token_res.json().get("access_token")
    notif_res = requests.post(
        "http://localhost:8080/notifications/send",
        json={
            "recipient_user_ids": [token_res.json()["user"]["id"]],
            "channel": "both",
            "subject": "Test Script AI",
            "body": "Pesan dari AI Antigravity berjalan sukses",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    print(notif_res.json())
