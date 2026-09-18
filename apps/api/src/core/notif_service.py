"""
apps/api/src/core/notif_service.py

Notification Service — HTTP client ke WhatsApp Microservice.

Menggantikan implementasi simulasi sebelumnya dengan integrasi nyata ke
WhatsApp microservice (apps/whatsapp/) via REST API + API Key auth.

Flow:
1. Lookup template dari notification_templates (fallback ke plaintext)
2. Render template dengan context variabel
3. POST ke WA microservice → enqueue ke BullMQ
4. Log ke notification_logs (status = queued)
5. Delivery status dikirim balik via webhook (/notifications/webhook/whatsapp)
"""

from __future__ import annotations

import concurrent.futures
import datetime
import logging
import uuid
from typing import Any, cast
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import text

from src.core.config import settings
from src.core.database import create_record, get_raw_pool

logger = logging.getLogger("ptdarrahman.notif")

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)


# ── WA Microservice Client ────────────────────────────────────────────────────


def _wa_client() -> httpx.Client:
    """Create an httpx client configured for the WA microservice."""
    return httpx.Client(
        base_url=settings.wa_service_url,
        headers={
            "Authorization": f"Bearer {settings.wa_service_api_key}",
            "Content-Type": "application/json",
        },
        timeout=10.0,
    )


def _send_to_wa_service(
    phone: str,
    message: str,
    event_key: str,
    recipient_user_id: str,
    template_id: str | None = None,
    priority: str = "normal",
) -> dict[str, Any]:
    """
    POST ke WA microservice untuk enqueue pesan.
    Returns job info atau raises jika service tidak tersedia.
    """
    if not settings.wa_service_url or not settings.wa_service_api_key:
        raise RuntimeError(
            "WA_SERVICE_URL atau WA_SERVICE_API_KEY belum dikonfigurasi di .env"
        )

    payload: dict[str, Any] = {
        "to": phone,
        "message": message,
        "eventKey": event_key,
        "recipientUserId": recipient_user_id,
        "priority": priority,
    }
    if template_id:
        payload["templateId"] = template_id

    with _wa_client() as client:
        resp = client.post("/api/messages/send", json=payload)
        resp.raise_for_status()
        return cast(dict[str, Any], resp.json())


# ── Template Rendering ────────────────────────────────────────────────────────


def _render_template(template: dict[str, Any], ctx: dict[str, Any]) -> tuple[str, str]:
    """Render template body dan subject dengan context. Returns (subject, body)."""
    subject = template.get("email_subject") or ""
    body = template.get("body") or ""
    for k, v in ctx.items():
        subject = subject.replace(f"{{{k}}}", str(v))
        body = body.replace(f"{{{k}}}", str(v))
    return subject, body


# ── Notification Log ──────────────────────────────────────────────────────────


def _log_notification(
    *,
    template_id: str | None,
    event_key: str,
    recipient_user_id: str,
    recipient_name: str,
    recipient_email: str,
    recipient_phone: str,
    channel: str,
    subject_sent: str,
    body_sent: str,
    status: str = "queued",
    error_message: str | None = None,
) -> str:
    """Insert row ke notification_logs. Returns log ID."""
    now_wib = datetime.datetime.now(ZoneInfo("Asia/Jakarta")).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    log_id = f"notiflog-{uuid.uuid4()}"
    create_record(
        "notification_logs",
        {
            "id": log_id,
            "template_id": template_id,
            "event_key": event_key,
            "recipient_user_id": recipient_user_id,
            "recipient_name": recipient_name,
            "recipient_email": recipient_email,
            "recipient_phone": recipient_phone,
            "channel": channel,
            "subject_sent": subject_sent,
            "body_sent": body_sent,
            "status": status,
            "retry_count": 0,
            "sent_at": now_wib if status == "sent" else None,
            "error_message": error_message,
            "created_at": now_wib,
        },
        return_row=False,
    )
    return log_id


# ── Core Send Functions ───────────────────────────────────────────────────────


def send_notification(
    event_key: str, recipient_user_id: str, context: dict[str, Any]
) -> None:
    """Kirim satu notifikasi berdasarkan event_key (async, fire-and-forget)."""
    send_notifications([(event_key, context)], recipient_user_id)


def send_notifications(
    events: list[tuple[str, dict[str, Any]]],
    recipient_user_id: str,
    user_row: dict | None = None,
    applicant_row: dict | None = None,
) -> None:
    """
    Kirim beberapa notifikasi sekaligus dengan satu set lookup.
    Non-blocking — dijalankan di background thread.
    """
    if not events:
        return
    _executor.submit(
        _sync_send_notifications,
        events,
        recipient_user_id,
        user_row,
        applicant_row,
    )


def _sync_send_notifications(
    events: list[tuple[str, dict[str, Any]]],
    recipient_user_id: str,
    user_row: dict | None = None,
    applicant_row: dict | None = None,
) -> None:
    try:
        keys = [k for k, _ in events]
        pool = get_raw_pool()

        with pool.connect() as conn:
            # Load templates
            placeholders = ", ".join(f":k{i}" for i in range(len(keys)))
            params: dict[str, Any] = {f"k{i}": k for i, k in enumerate(keys)}
            rows = (
                conn.execute(
                    text(
                        "SELECT * FROM notification_templates "
                        f"WHERE event_key IN ({placeholders})"
                    ),
                    params,
                )
                .mappings()
                .all()
            )
            templates = {r["event_key"]: dict(r) for r in rows}

            # Load user
            user = user_row
            if user is None:
                urows = (
                    conn.execute(
                        text("SELECT * FROM users WHERE id = :id"),
                        {"id": recipient_user_id},
                    )
                    .mappings()
                    .all()
                )
                user = urows[0] if urows else None

            if user is None:
                logger.warning(
                    f"User {recipient_user_id} not found. Skipping notifications."
                )
                return

            # Load applicant (optional)
            applicant = applicant_row
            if applicant is None:
                arows = (
                    conn.execute(
                        text("SELECT * FROM ppdb_applicants WHERE user_id = :id"),
                        {"id": recipient_user_id},
                    )
                    .mappings()
                    .all()
                )
                applicant = arows[0] if arows else {}

        for event_key, context in events:
            template = templates.get(event_key)
            if not template or not template.get("is_active"):
                logger.info(f"Template '{event_key}' not found or inactive. Skipping.")
                continue

            ctx: dict[str, Any] = {
                "nama_peserta": (applicant or {}).get("full_name")
                or user.get("full_name", ""),
                "username": user.get("username", ""),
                **context,
            }

            subject, body = _render_template(template, ctx)
            channel = template.get("channel", "email")
            phone = (applicant or {}).get("phone") or user.get("phone", "")
            template_id = template.get("id")

            # Log entry
            log_id = _log_notification(
                template_id=template_id,
                event_key=event_key,
                recipient_user_id=str(user["id"]),
                recipient_name=str(ctx["nama_peserta"]),
                recipient_email=str(user.get("email", "")),
                recipient_phone=str(phone),
                channel=channel,
                subject_sent=subject,
                body_sent=body,
                status="queued",
            )

            # Send WhatsApp jika channel-nya WA
            if channel in ("whatsapp", "both") and phone:
                try:
                    result = _send_to_wa_service(
                        phone=str(phone),
                        message=body,
                        event_key=event_key,
                        recipient_user_id=str(user["id"]),
                        template_id=template_id,
                    )
                    logger.info(
                        f"WA enqueued for {event_key}",
                        extra={
                            "jobId": result.get("data", {}).get("jobId"),
                            "logId": log_id,
                        },
                    )
                except httpx.HTTPStatusError as e:
                    logger.error(
                        f"WA microservice HTTP error for {event_key}: "
                        f"{e.response.status_code}",
                        exc_info=True,
                    )
                except Exception:
                    logger.exception(
                        f"Failed to send WA notification for event {event_key}"
                    )
            else:
                logger.info(
                    f"Skipping WA for {event_key}: channel={channel}, "
                    f"phone={'set' if phone else 'missing'}"
                )

    except Exception:
        logger.exception("Background notification task failed")


def send_custom_notifications(
    recipient_user_ids: list[str],
    channel: str,
    subject: str,
    body: str,
    event_key: str = "custom",
) -> dict[str, Any]:
    """
    Kirim pesan bebas ke daftar user (tanpa template).
    Returns dict dengan jumlah yang di-queue.
    """
    if not recipient_user_ids:
        return {"queued": 0}

    _executor.submit(
        _sync_send_custom_notifications,
        recipient_user_ids,
        channel,
        subject,
        body,
        event_key,
    )
    return {"queued": len(recipient_user_ids)}


def _sync_send_custom_notifications(
    recipient_user_ids: list[str],
    channel: str,
    subject: str,
    body: str,
    event_key: str,
) -> None:
    try:
        pool = get_raw_pool()
        with pool.connect() as conn:
            for user_id in recipient_user_ids:
                rows = (
                    conn.execute(
                        text("SELECT * FROM users WHERE id = :id"), {"id": user_id}
                    )
                    .mappings()
                    .all()
                )
                if not rows:
                    continue
                user = dict(rows[0])

                arows = (
                    conn.execute(
                        text("SELECT * FROM ppdb_applicants WHERE user_id = :id"),
                        {"id": user_id},
                    )
                    .mappings()
                    .all()
                )
                applicant = dict(arows[0]) if arows else {}

                phone = applicant.get("phone") or user.get("phone", "")

                _log_notification(
                    template_id=None,
                    event_key=event_key,
                    recipient_user_id=user["id"],
                    recipient_name=applicant.get("full_name")
                    or user.get("full_name", ""),
                    recipient_email=user.get("email", ""),
                    recipient_phone=str(phone),
                    channel=channel,
                    subject_sent=subject,
                    body_sent=body,
                    status="queued",
                )

                if channel in ("whatsapp", "both") and phone:
                    try:
                        _send_to_wa_service(
                            phone=str(phone),
                            message=body,
                            event_key=event_key,
                            recipient_user_id=user["id"],
                        )
                    except Exception:
                        logger.exception(
                            f"Failed to enqueue WA for custom notification to user "
                            f"{user_id}"
                        )

    except Exception:
        logger.exception("Background custom notification task failed")
