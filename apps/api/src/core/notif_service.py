"""
apps/api/src/core/notif_service.py

Notification Service — async HTTP client ke WhatsApp Microservice.

Flow:
1. Lookup template dari notification_templates (fallback: skip)
2. Render template dengan context variabel
3. POST ke WA microservice → enqueue ke BullMQ (async httpx)
4. Log ke notification_logs (status = queued)
5. Delivery status di-push balik via webhook (/notifications/webhook/whatsapp)

Non-blocking: send_notification / send_notifications mengembalikan immediately;
pengiriman aktual dijalankan sebagai asyncio Task di event-loop yang sedang
berjalan sehingga tidak memblokir request handler.
"""

from __future__ import annotations

import asyncio
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

# ── Async WA Microservice Client ──────────────────────────────────────────────


async def _async_send_to_wa_service(
    phone: str,
    message: str,
    event_key: str,
    recipient_user_id: str,
    template_id: str | None = None,
    priority: str = "normal",
) -> dict[str, Any]:
    """
    POST asinkron ke WA microservice.
    Raise httpx.HTTPStatusError / RuntimeError pada failure.
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

    async with httpx.AsyncClient(
        base_url=settings.wa_service_url,
        headers={
            "Authorization": f"Bearer {settings.wa_service_api_key}",
            "Content-Type": "application/json",
        },
        timeout=10.0,
    ) as client:
        resp = await client.post("/api/messages/send", json=payload)
        resp.raise_for_status()
        return cast(dict[str, Any], resp.json())


# ── Channel resolution ───────────────────────────────────────────────────────


def resolve_channel(channel: str) -> str:
    """Tentukan channel efektif untuk sebuah template.

    Email belum dipakai sama sekali, jadi selama ``NOTIF_EMAIL_ENABLED`` False,
    semua template — baik ``email``, ``whatsapp``, maupun ``both`` — dikirim via
    WhatsApp. Tanpa ini, template ber-channel ``email`` akan dilewati begitu saja
    dan penerima tidak pernah diberi tahu.
    """
    if not settings.notif_email_enabled:
        return "whatsapp"
    return channel


# ── Template Rendering ────────────────────────────────────────────────────────


def _render_template(template: dict[str, Any], ctx: dict[str, Any]) -> tuple[str, str]:
    """Return (subject, body) rendered with ctx variables."""
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
    """Insert a row into notification_logs. Returns the new log ID."""
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


# ── Core async send ───────────────────────────────────────────────────────────


async def _async_send_notifications(
    events: list[tuple[str, dict[str, Any]]],
    recipient_user_id: str,
    user_row: dict | None = None,
    applicant_row: dict | None = None,
) -> None:
    """Actual async implementation — runs as a fire-and-forget task."""
    try:
        keys = [k for k, _ in events]
        pool = get_raw_pool()

        with pool.connect() as conn:
            # Load templates in one query
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

            # Load user if not provided
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
                user = dict(urows[0]) if urows else None

            if user is None:
                logger.warning(
                    "User %s not found — skipping notifications.", recipient_user_id
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
                applicant = dict(arows[0]) if arows else {}

        for event_key, context in events:
            template = templates.get(event_key)
            if not template or not template.get("is_active"):
                logger.info(
                    "Template '%s' not found or inactive — skipping.", event_key
                )
                continue

            ctx: dict[str, Any] = {
                "nama_peserta": (applicant or {}).get("full_name")
                or user.get("full_name", ""),
                "username": user.get("username", ""),
                **context,
            }

            subject, body = _render_template(template, ctx)
            raw_channel = template.get("channel", "email")
            channel = resolve_channel(raw_channel)
            if channel != raw_channel:
                logger.debug(
                    "Template %s: channel %s -> %s (email nonaktif)",
                    event_key,
                    raw_channel,
                    channel,
                )
            phone = (applicant or {}).get("phone") or user.get("phone", "")
            template_id = template.get("id")

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

            if channel in ("whatsapp", "both") and phone:
                try:
                    result = await _async_send_to_wa_service(
                        phone=str(phone),
                        message=body,
                        event_key=event_key,
                        recipient_user_id=str(user["id"]),
                        template_id=template_id,
                    )
                    logger.info(
                        "WA enqueued for %s (jobId=%s, logId=%s)",
                        event_key,
                        result.get("data", {}).get("jobId"),
                        log_id,
                    )
                except httpx.HTTPStatusError as e:
                    logger.error(
                        "WA microservice HTTP error for %s: %s",
                        event_key,
                        e.response.status_code,
                        exc_info=True,
                    )
                except Exception:
                    logger.exception(
                        "Failed to send WA notification for event %s", event_key
                    )
            else:
                logger.info(
                    "Skipping WA for %s: channel=%s phone=%s",
                    event_key,
                    channel,
                    "set" if phone else "missing",
                )

    except Exception:
        logger.exception("Async notification task failed")


async def _async_send_custom_notifications(
    recipient_user_ids: list[str],
    channel: str,
    subject: str,
    body: str,
    event_key: str,
) -> None:
    """Actual async implementation for custom blast — fire-and-forget.

    FIX: Bulk-load semua user + applicant dalam 2 query (bukan 2N).
    Sebelumnya: 2 query per user = 200 queries untuk 100 penerima.
    Sekarang: 2 query total berapapun jumlah penerima.
    """
    try:
        if not recipient_user_ids:
            return

        # Email nonaktif → semua blast dipaksa ke WhatsApp.
        channel = resolve_channel(channel)

        pool = get_raw_pool()
        with pool.connect() as conn:
            # Bulk-load semua user sekaligus
            placeholders = ", ".join(f":uid{i}" for i in range(len(recipient_user_ids)))
            uid_params: dict[str, Any] = {
                f"uid{i}": uid for i, uid in enumerate(recipient_user_ids)
            }

            user_rows = (
                conn.execute(
                    text(f"SELECT * FROM users WHERE id IN ({placeholders})"),
                    uid_params,
                )
                .mappings()
                .all()
            )
            users_by_id: dict[str, dict[str, Any]] = {
                str(r["id"]): dict(r) for r in user_rows
            }

            # Bulk-load semua applicant sekaligus
            applicant_rows = (
                conn.execute(
                    text(
                        f"SELECT * FROM ppdb_applicants WHERE user_id IN "
                        f"({placeholders})"
                    ),
                    uid_params,
                )
                .mappings()
                .all()
            )
            applicants_by_user_id: dict[str, dict[str, Any]] = {
                str(r["user_id"]): dict(r) for r in applicant_rows
            }

        for user_id in recipient_user_ids:
            user = users_by_id.get(user_id)
            if not user:
                logger.warning("User %s not found — skipping", user_id)
                continue

            applicant = applicants_by_user_id.get(user_id, {})
            phone = applicant.get("phone") or user.get("phone", "")

            _log_notification(
                template_id=None,
                event_key=event_key,
                recipient_user_id=user["id"],
                recipient_name=applicant.get("full_name") or user.get("full_name", ""),
                recipient_email=user.get("email", ""),
                recipient_phone=str(phone),
                channel=channel,
                subject_sent=subject,
                body_sent=body,
                status="queued",
            )

            if channel in ("whatsapp", "both") and phone:
                try:
                    await _async_send_to_wa_service(
                        phone=str(phone),
                        message=body,
                        event_key=event_key,
                        recipient_user_id=user["id"],
                    )
                except Exception:
                    logger.exception(
                        "Failed to enqueue WA custom notification for user %s",
                        user_id,
                    )

    except Exception:
        logger.exception("Async custom notification task failed")


# ── Public API (fire-and-forget) ──────────────────────────────────────────────


def _fire(coro) -> None:
    """Schedule *coro* as an asyncio Task if an event loop is running."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # Fallback: no running loop (e.g. during tests / scripts)
        asyncio.run(coro)


def send_notification(
    event_key: str, recipient_user_id: str, context: dict[str, Any]
) -> None:
    """Queue a single notification (fire-and-forget)."""
    send_notifications([(event_key, context)], recipient_user_id)


def send_notifications(
    events: list[tuple[str, dict[str, Any]]],
    recipient_user_id: str,
    user_row: dict | None = None,
    applicant_row: dict | None = None,
) -> None:
    """Queue multiple notifications for the same user (fire-and-forget)."""
    if not events:
        return
    _fire(_async_send_notifications(events, recipient_user_id, user_row, applicant_row))


def send_custom_notifications(
    recipient_user_ids: list[str],
    channel: str,
    subject: str,
    body: str,
    event_key: str = "custom",
) -> dict[str, Any]:
    """Blast a free-form message to a list of users (fire-and-forget)."""
    if not recipient_user_ids:
        return {"queued": 0}
    _fire(
        _async_send_custom_notifications(
            recipient_user_ids, channel, subject, body, event_key
        )
    )
    return {"queued": len(recipient_user_ids)}
