"""
apps/api/src/modules/whatsapp/router.py

Proxy ke WhatsApp microservice (apps/whatsapp/) untuk Superadmin panel.

Endpoints (semua require_superadmin):
  GET  /whatsapp/status        — status sesi + health + hint webhook
  GET  /whatsapp/qr            — QR code one-shot (data URL)
  GET  /whatsapp/qr-sse        — QR realtime (SSE proxy dari microservice)
  POST /whatsapp/connect       — inisialisasi / reconnect sesi
  POST /whatsapp/pairing-code  — buat pairing code (login via nomor HP)
  POST /whatsapp/pairing-code/cancel — batalkan pairing code
  POST /whatsapp/disconnect    — logout & reset sesi
  POST /whatsapp/test          — kirim pesan uji coba
  GET  /whatsapp/queue         — statistik antrean pesan
  GET  /whatsapp/logs          — log pengiriman (paginated)
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from src.core.config import settings
from src.core.dependencies import require_superadmin

logger = logging.getLogger("ptdarrahman.whatsapp")
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _wa_base() -> str:
    return settings.wa_service_url.rstrip("/")


def _wa_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.wa_service_api_key}",
        "Content-Type": "application/json",
    }


def _wa_configured() -> bool:
    return bool(settings.wa_service_url and settings.wa_service_api_key)


def _not_configured() -> HTTPException:
    return HTTPException(
        status_code=400,
        detail=(
            "WA_SERVICE_URL / WA_SERVICE_API_KEY belum dikonfigurasi di apps/api/.env. "
            "Tambahkan keduanya (nilai sama dengan API_KEY di apps/whatsapp/.env)."
        ),
    )


def _expected_webhook() -> str:
    return f"{settings.api_base_url.rstrip('/')}/notifications/webhook/whatsapp"


def _url_host_port(url: str) -> tuple[str, str, int] | None:
    """Extract (scheme, host, port) untuk membandingkan base URL dua endpoint."""
    try:
        p = urlparse(url)
    except ValueError:
        return None
    default_port = 443 if p.scheme == "https" else 80
    port = p.port or default_port
    return p.scheme, (p.hostname or ""), port


def _webhook_warning(webhook_url: str | None, expected: str) -> bool | None:
    """True kalau WEBHOOK_URL microservice tidak menunjuk ke base API ini."""
    if not webhook_url:
        return False
    actual = _url_host_port(webhook_url)
    wanted = _url_host_port(expected)
    if actual is None or wanted is None:
        return None
    return actual[0] != wanted[0] or actual[1] != wanted[1] or actual[2] != wanted[2]


def _check_service_config() -> None:
    if not _wa_configured():
        raise _not_configured()


async def _proxy_json(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    timeout: float = 8.0,
) -> httpx.Response:
    """Forward request ke microservice; raise HTTPException bila service mati."""
    _check_service_config()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.request(
                method,
                f"{_wa_base()}{path}",
                headers=_wa_headers(),
                json=json_body,
                params=params,
            )
    except httpx.HTTPError as exc:
        target = f"{_wa_base()}{path}"
        logger.warning("WhatsApp microservice unreachable at %s: %s", target, exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "WhatsApp microservice tidak dapat dihubungi. "
                "Pastikan sudah dijalankan (cd apps/whatsapp && pnpm dev)."
            ),
        ) from exc


def _json_response(resp: httpx.Response) -> JSONResponse:
    """Wrap respon microservice: body dipertahankan, selalu 200 + flag success.

    Frontend memakai pola `json.success / json.error / json.data` — seperti
    yang sudah dipakai microservice — sehingga pesan error yang ramah sampai
    utuh tanpa perlu throw dari apiFetch.
    """
    try:
        body = resp.json()
    except Exception:
        msg = f"Respon non-JSON dari WA microservice (HTTP {resp.status_code})"
        body = {"error": msg}

    if not isinstance(body, dict):
        body = {"data": body}

    if resp.status_code >= 400:
        body.setdefault("success", False)
        if "error" not in body:
            body["error"] = body.get("message") or body.get(
                "detail"
            ) or f"WA microservice error (HTTP {resp.status_code})"
    elif "success" not in body:
        body["success"] = True

    return JSONResponse(status_code=200, content=body)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/status")
async def whatsapp_status(
    user: dict[str, Any] = Depends(require_superadmin),
) -> dict[str, Any]:
    """Status sesi WhatsApp + health + hint webhook (selalu 200)."""
    if not _wa_configured():
        return {
            "configured": False,
            "message": "WA_SERVICE_URL / WA_SERVICE_API_KEY belum dikonfigurasi.",
            "status": "OFFLINE",
            "isReady": False,
            "phone": None,
            "pushName": None,
            "connectedAt": None,
            "health": None,
            "webhookUrl": None,
            "webhookMismatch": None,
            "expectedWebhookUrl": _expected_webhook(),
            "error": None,
        }

    expected = _expected_webhook()
    session: dict[str, Any] | None = None
    health: dict[str, Any] | None = None
    status_error: str | None = None

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            r = await client.get(f"{_wa_base()}/api/session", headers=_wa_headers())
            if r.status_code == 200:
                payload = r.json()
                session = payload.get("data") if isinstance(payload, dict) else None
            else:
                status_error = f"WA microservice menjawab {r.status_code}"
        except httpx.HTTPError as exc:
            logger.warning("WA session fetch failed: %s", exc)
            status_error = None

        try:
            h = await client.get(f"{_wa_base()}/health/detailed", headers=_wa_headers())
            if h.status_code == 200:
                health = h.json()
        except httpx.HTTPError:
            pass

    webhook_url: str | None = None
    if health and isinstance(health.get("webhookUrl"), str):
        webhook_url = health["webhookUrl"]

    if session is None:
        return {
            "configured": True,
            "status": "OFFLINE",
            "isReady": False,
            "phone": None,
            "pushName": None,
            "connectedAt": None,
            "health": health,
            "webhookUrl": webhook_url,
            "webhookMismatch": _webhook_warning(webhook_url, expected),
            "expectedWebhookUrl": expected,
            "error": status_error or "WhatsApp microservice tidak dapat dihubungi.",
        }

    return {
        "configured": True,
        "status": session.get("status", "disconnected"),
        "isReady": session.get("status") == "ready",
        "phone": session.get("phone"),
        "pushName": session.get("pushName"),
        "connectedAt": session.get("connectedAt"),
        "lastActivity": session.get("lastActivity"),
        "pairingCode": session.get("pairingCode"),
        "pairingPhone": session.get("pairingPhone"),
        "health": health,
        "webhookUrl": webhook_url,
        "webhookMismatch": _webhook_warning(webhook_url, expected),
        "expectedWebhookUrl": expected,
        "error": None,
    }


@router.get("/qr")
async def whatsapp_qr(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """One-shot QR code (data URL) dari microservice."""
    resp = await _proxy_json("GET", "/api/session/qr/image", timeout=6.0)
    return _json_response(resp)


@router.get("/qr-sse")
async def whatsapp_qr_sse(
    user: dict[str, Any] = Depends(require_superadmin),
) -> StreamingResponse:
    """Proxy SSE live QR dari microservice (frontend tidak sentuh :3100)."""
    _check_service_config()

    async def _stream():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "GET",
                    f"{_wa_base()}/api/session/qr",
                    headers=_wa_headers(),
                ) as resp:
                    if resp.status_code != 200:
                        frame = (
                            'event: error\ndata: {"error":'
                            f'"WA SSE gagal (HTTP {resp.status_code})"}}\n\n'
                        )
                        yield frame.encode()
                        return
                    async for chunk in resp.aiter_bytes():
                        yield chunk
        except httpx.HTTPError:
            yield b'event: error\ndata: {"error":"WA tidak dapat dihubungi"}\n\n'

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/connect")
async def whatsapp_connect(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Inisialisasi / reconnect sesi WhatsApp."""
    resp = await _proxy_json("POST", "/api/session/init", timeout=8.0)
    return _json_response(resp)


class WhatsAppPairingBody(BaseModel):
    phone: str
    show_notification: bool = True


@router.post("/pairing-code")
async def whatsapp_pairing_code(
    body: WhatsAppPairingBody,
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Buat pairing code untuk login via nomor HP (opsi selain scan QR)."""
    phone = "".join(ch for ch in body.phone if ch.isdigit())
    if phone.startswith("0"):
        phone = "62" + phone[1:]
    if not phone:
        raise HTTPException(status_code=400, detail="Nomor HP wajib diisi")
    if len(phone) < 10:
        raise HTTPException(
            status_code=400,
            detail=(
                "Nomor HP tidak valid. Gunakan format internasional, "
                "mis. 628123456789"
            ),
        )
    resp = await _proxy_json(
        "POST",
        "/api/session/pairing-code",
        json_body={"phone": phone, "showNotification": body.show_notification},
        timeout=40.0,
    )
    return _json_response(resp)


@router.post("/pairing-code/cancel")
async def whatsapp_pairing_code_cancel(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Batalkan pairing code dan kembali ke mode QR."""
    resp = await _proxy_json("POST", "/api/session/pairing-code/cancel", timeout=8.0)
    return _json_response(resp)


@router.post("/disconnect")
async def whatsapp_disconnect(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Logout & reset sesi WhatsApp."""
    resp = await _proxy_json("POST", "/api/session/logout", timeout=10.0)
    return _json_response(resp)


class WhatsAppTestBody(BaseModel):
    phone: str
    message: str = ""


@router.post("/test")
async def whatsapp_test(
    body: WhatsAppTestBody,
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Kirim pesan uji coba via microservice (eventKey: test)."""
    phone = body.phone.strip().lstrip("+")
    if not phone:
        raise HTTPException(status_code=400, detail="Nomor telepon wajib diisi")
    message = body.message.strip() or (
        "Assalamualaikum Wr. Wb.\n\n"
        "Ini adalah pesan uji coba dari panel PPDB Ar-Rahman. "
        "Jika Anda menerima pesan ini, notifikasi WhatsApp sudah terkoneksi."
    )
    resp = await _proxy_json(
        "POST",
        "/api/messages/send",
        json_body={"to": phone, "message": message, "eventKey": "test"},
        timeout=15.0,
    )
    return _json_response(resp)


@router.get("/queue")
async def whatsapp_queue(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Statistik antrean pesan dari BullMQ."""
    resp = await _proxy_json("GET", "/api/messages/queue", timeout=6.0)
    return _json_response(resp)


@router.get("/logs")
async def whatsapp_logs(
    page: int = Query(1, ge=1),
    perPage: int = Query(10, ge=1, le=100),
    status: str | None = Query(None),
    eventKey: str | None = Query(None),
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Log pengiriman pesan WA (paginated)."""
    params: dict[str, Any] = {"page": page, "perPage": perPage}
    if status:
        params["status"] = status
    if eventKey:
        params["eventKey"] = eventKey
    resp = await _proxy_json("GET", "/api/messages/logs", params=params, timeout=8.0)
    return _json_response(resp)


@router.post("/template-cache/clear")
async def whatsapp_template_cache_clear(
    user: dict[str, Any] = Depends(require_superadmin),
) -> JSONResponse:
    """Invalidate template cache di microservice (dipakai setelah edit template)."""
    resp = await _proxy_json("POST", "/api/templates/cache/clear", timeout=8.0)
    return _json_response(resp)