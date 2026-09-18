"""
apps/api/src/modules/notifications/router.py

Notifications module router.

Endpoints:
  GET  /notifications/templates          — List all templates
  GET  /notifications/templates/{id}     — Get template by ID
  PUT  /notifications/templates/{id}     — Update template
  POST /notifications/send               — Send custom notification
  GET  /notifications/logs               — Get delivery logs (paginated)
  GET  /notifications/status             — WA microservice health status
  POST /notifications/webhook/whatsapp   — Webhook callback dari WA microservice
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text

from src.core.config import settings
from src.core.database import execute_raw, get_by_id, get_raw_pool, update_record
from src.core.dependencies import (
    require_notification_admin,
    require_notification_read,
)
from src.core.notif_service import send_custom_notifications

logger = logging.getLogger("ptdarrahman.notif")
router = APIRouter()


# ── Request/Response Models ───────────────────────────────────────────────────


class TemplateUpdate(BaseModel):
    label: str | None = None
    channel: str | None = None
    email_subject: str | None = None
    body: str | None = None
    is_active: bool | None = None


class CustomSend(BaseModel):
    recipient_user_ids: list[str]
    channel: str = "both"
    subject: str = ""
    body: str


# ── Template Endpoints ────────────────────────────────────────────────────────


@router.get("/templates")
def get_templates(user: dict = Depends(require_notification_read)):
    rows = execute_raw("SELECT * FROM notification_templates ORDER BY event_key ASC")
    return rows


@router.get("/templates/{id}")
def get_template(id: str, user: dict = Depends(require_notification_read)):
    row = get_by_id("notification_templates", id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return row


@router.put("/templates/{id}")
def update_template(
    id: str, body: TemplateUpdate, user: dict = Depends(require_notification_admin)
):
    data = {
        k: v
        for k, v in {
            "label": body.label,
            "channel": body.channel,
            "email_subject": body.email_subject,
            "body": body.body,
            "is_active": body.is_active,
        }.items()
        if v is not None
    }
    if not data:
        raise HTTPException(status_code=400, detail="Tidak ada field untuk diubah")
    updated = update_record("notification_templates", id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


# ── Send Endpoint ─────────────────────────────────────────────────────────────


@router.post("/send")
def send_custom(body: CustomSend, user: dict = Depends(require_notification_admin)):
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Body pesan tidak boleh kosong")
    if not body.recipient_user_ids:
        raise HTTPException(status_code=400, detail="Pilih minimal satu penerima")
    if body.channel not in ("email", "whatsapp", "both"):
        raise HTTPException(status_code=400, detail="Channel tidak valid")

    result = send_custom_notifications(
        recipient_user_ids=body.recipient_user_ids,
        channel=body.channel,
        subject=body.subject,
        body=body.body,
    )
    return {"message": "Notifikasi masuk antrian", **result}


# ── Logs Endpoint ─────────────────────────────────────────────────────────────


@router.get("/logs")
def get_logs(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    event_key: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    offset = (page - 1) * perPage
    sql = "SELECT * FROM notification_logs WHERE 1=1"
    count_sql = "SELECT COUNT(*) as cnt FROM notification_logs WHERE 1=1"
    params: dict[str, Any] = {}

    if status:
        sql += " AND status = :status"
        count_sql += " AND status = :status"
        params["status"] = status
    if event_key:
        sql += " AND event_key = :event_key"
        count_sql += " AND event_key = :event_key"
        params["event_key"] = event_key

    sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()

    return {
        "data": [dict(r) for r in rows],
        "total": count_rows[0]["cnt"],
        "page": page,
        "perPage": perPage,
        "totalPages": -(-count_rows[0]["cnt"] // perPage),  # ceiling division
    }


# ── WA Service Status ─────────────────────────────────────────────────────────


@router.get("/status")
async def get_wa_status(user: dict = Depends(require_notification_read)):
    """Proxy ke WA microservice health check."""
    import httpx

    if not settings.wa_service_url or not settings.wa_service_api_key:
        return {
            "configured": False,
            "message": "WA_SERVICE_URL atau WA_SERVICE_API_KEY belum dikonfigurasi",
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.wa_service_url}/health/detailed",
                headers={"Authorization": f"Bearer {settings.wa_service_api_key}"},
            )
            return {
                "configured": True,
                "httpStatus": resp.status_code,
                "data": resp.json(),
            }
    except httpx.ConnectError:
        return {
            "configured": True,
            "httpStatus": 503,
            "error": "WA microservice tidak dapat dihubungi",
        }
    except Exception as e:
        return {
            "configured": True,
            "httpStatus": 500,
            "error": str(e),
        }


# ── Webhook Endpoint (callback dari WA microservice) ─────────────────────────


def _verify_wa_webhook(body_bytes: bytes, timestamp: str, signature: str) -> bool:
    """Verifikasi HMAC-SHA256 signature dari WA microservice."""
    secret = settings.wa_webhook_secret
    if not secret:
        # Jika secret belum dikonfigurasi, log warning dan terima
        logger.warning(
            "WA_WEBHOOK_SECRET tidak dikonfigurasi — webhook tidak terverifikasi"
        )
        return True

    # Check timestamp tidak terlalu lama (max 5 menit)
    try:
        ts_int = int(timestamp)
        if abs(time.time() - ts_int) > 300:
            logger.warning(
                "Webhook timestamp terlalu lama", extra={"timestamp": timestamp}
            )
            return False
    except (ValueError, TypeError):
        return False

    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{body_bytes.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison
    provided = signature.removeprefix("sha256=")
    return hmac.compare_digest(expected, provided)


@router.post("/webhook/whatsapp")
async def wa_webhook(request: Request):
    """
    Menerima delivery status callback dari WA microservice.
    Update notification_logs berdasarkan event yang diterima.
    """
    body_bytes = await request.body()
    signature = request.headers.get("X-WA-Signature", "")
    timestamp = request.headers.get("X-WA-Timestamp", "")

    if not _verify_wa_webhook(body_bytes, timestamp, signature):
        logger.warning("Invalid webhook signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    data = payload.get("data", {})

    pool = get_raw_pool()
    with pool.connect() as conn:
        if event == "message.sent":
            job_id = data.get("jobId")
            wa_message_id = data.get("waMessageId")
            if job_id:
                conn.execute(
                    text(
                        "UPDATE notification_logs "
                        "SET status = 'sent', wa_message_id = :wa_id, sent_at = NOW() "
                        "WHERE event_key = :event_key OR id LIKE :job_pattern "
                        "LIMIT 1"
                    ),
                    {
                        "wa_id": wa_message_id,
                        "event_key": data.get("eventKey", ""),
                        "job_pattern": f"%{job_id}%",
                    },
                )
                conn.commit()
                logger.info(f"Webhook: message.sent — jobId={job_id}")

        elif event == "message.failed":
            job_id = data.get("jobId")
            error_code = data.get("errorCode", "unknown")
            error_msg = data.get("errorMessage", "")
            status = "invalid_number" if error_code == "invalid_number" else "failed"

            if job_id:
                conn.execute(
                    text(
                        "UPDATE notification_logs "
                        "SET status = :status, error_message = :msg "
                        "WHERE event_key = :event_key OR id LIKE :job_pattern "
                        "LIMIT 1"
                    ),
                    {
                        "status": status,
                        "msg": f"{error_code}: {error_msg}",
                        "event_key": data.get("eventKey", ""),
                        "job_pattern": f"%{job_id}%",
                    },
                )
                conn.commit()
                logger.info(
                    f"Webhook: message.failed — jobId={job_id}, code={error_code}"
                )

        elif event == "session.ready":
            logger.info("Webhook: WA session is ready")
        elif event == "session.disconnected":
            logger.warning(
                f"Webhook: WA session disconnected — reason={data.get('reason')}"
            )

    return JSONResponse({"received": True, "event": event})
