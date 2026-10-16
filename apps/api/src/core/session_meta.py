"""Metadata sesi perangkat untuk halaman Profile ("Sesi Perangkat").

Modul ini murni helper (tanpa akses DB):
  - `get_session_context(request)` : ekstrak User-Agent/IP/app dari request.
  - `parse_user_agent(ua)`         : ringkas UA jadi label browser/OS.
  - `app_label(app, user_type)`     : label aplikasi yang dipakai sesi.
  - `serialize_session(...)`        : bentuk payload JSON untuk frontend.

Nilai `app` dikirim frontend lewat header `X-Client-App` saat login. Nilai yang
tidak dikenal tetap disimpan apa adanya (dipotong 50 char) tetapi diberi label
netral supaya UI tidak menampilkan data mentah.
"""

from __future__ import annotations

from typing import Any

# Nilai header yang dikenal → label tampilan.
APP_LABELS: dict[str, str] = {
    "companyprofile": "Company Profile",
    "superadmin": "Superadmin",
    "ppdb-admin": "PPDB Backoffice",
    "ppdb-applicant": "PPDB Pendaftar",
}


def get_session_context(request: Any) -> dict[str, str]:
    """Ambil metadata perangkat dari sebuah FastAPI `Request`."""
    headers = getattr(request, "headers", {}) or {}
    ua = str(headers.get("user-agent") or "").strip()[:512]

    app = str(headers.get("x-client-app") or "").strip().lower()[:50]

    forwarded = str(headers.get("x-forwarded-for") or "").strip()
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        client = getattr(request, "client", None)
        ip = getattr(client, "host", "") if client else ""
    ip = (ip or "")[:64]

    return {"user_agent": ua, "ip_address": ip, "app": app}


def parse_user_agent(user_agent: str | None) -> dict[str, str]:
    """Ringkas User-Agent menjadi label browser/OS yang ramah dibaca."""
    ua = user_agent or ""
    low = ua.lower()

    # Browser (urutan penting: Edge/Opera mengandung token Chrome/Safari).
    if "edg" in low or "edgios" in low or "edga" in low:
        browser = "Microsoft Edge"
    elif "opr/" in low or "opera" in low:
        browser = "Opera"
    elif "samsungbrowser" in low:
        browser = "Samsung Internet"
    elif "chrome" in low or "crios" in low:
        browser = "Chrome"
    elif "firefox" in low or "fxios" in low:
        browser = "Firefox"
    elif "safari" in low:
        browser = "Safari"
    elif not ua:
        browser = "Tidak diketahui"
    else:
        browser = "Browser lain"

    # OS (urutan penting: Android mengandung "linux", iPad/iPhone "like mac").
    if "android" in low:
        os_name = "Android"
    elif "iphone" in low or "ipod" in low:
        os_name = "iOS"
    elif "ipad" in low:
        os_name = "iPadOS"
    elif "windows" in low:
        os_name = "Windows"
    elif "mac os" in low or "macintosh" in low:
        os_name = "macOS"
    elif "linux" in low:
        os_name = "Linux"
    elif not ua:
        os_name = "Tidak diketahui"
    else:
        os_name = "Lainnya"

    return {"browser": browser, "os": os_name}


def describe_device(user_agent: str | None) -> str:
    parsed = parse_user_agent(user_agent)
    return f"{parsed['browser']} · {parsed['os']}"


def resolve_app_label(app: str | None, user_type: str | None) -> str:
    """Label aplikasi yang dipakai sesi.

    `X-Client-App` = "ppdb" dipakai bersama admin & pendaftar PPDB, jadi label
    dibedakan dari `user_type` pemilik sesi.
    """
    key = (app or "").strip().lower()
    if key == "ppdb":
        return "PPDB Pendaftar" if (user_type or "") == "applicant" else "PPDB Backoffice"
    if key in APP_LABELS:
        return APP_LABELS[key]
    # Sesi lama (sebelum kolom `app` ada) → fallback berdasarkan tipe user.
    if not key:
        if (user_type or "") == "applicant":
            return "PPDB Pendaftar"
        if (user_type or "") == "superadmin":
            return "Superadmin"
        return "Tidak diketahui"
    return key


def serialize_session(
    token: Any,
    *,
    user_type: str | None,
    current_session_id: str | None,
) -> dict[str, Any]:
    """Ubah baris `RefreshToken` menjadi payload JSON untuk halaman Profile."""
    from zoneinfo import ZoneInfo

    wib = ZoneInfo("Asia/Jakarta")

    parsed = parse_user_agent(getattr(token, "user_agent", None))
    created_at = getattr(token, "created_at", None)
    if created_at and getattr(created_at, "tzinfo", None) is None:
        created_at = created_at.replace(tzinfo=wib)

    last_seen_at = getattr(token, "last_seen_at", None) or created_at
    if last_seen_at and getattr(last_seen_at, "tzinfo", None) is None:
        last_seen_at = last_seen_at.replace(tzinfo=wib)

    expires_at = getattr(token, "expires_at", None)
    if expires_at and getattr(expires_at, "tzinfo", None) is None:
        expires_at = expires_at.replace(tzinfo=wib)

    return {
        "id": token.id,
        "app": getattr(token, "app", None) or "",
        "app_label": resolve_app_label(getattr(token, "app", None), user_type),
        "device": f"{parsed['browser']} · {parsed['os']}",
        "browser": parsed["browser"],
        "os": parsed["os"],
        "ip_address": getattr(token, "ip_address", None) or "",
        "user_agent": getattr(token, "user_agent", None) or "",
        "created_at": created_at.isoformat() if created_at else None,
        "last_seen_at": last_seen_at.isoformat() if last_seen_at else None,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "is_current": bool(current_session_id and token.id == current_session_id),
    }
