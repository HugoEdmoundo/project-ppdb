"""
apps/api/src/modules/notifications/router.py

Notifications module router.

Endpoints:
  GET  /notifications/templates                — List all templates
  GET  /notifications/templates/{id}           — Get template by ID
  PUT  /notifications/templates/{id}           — Update template
  POST /notifications/send                     — Send custom notification
  GET  /notifications/logs                     — Get delivery logs (paginated)
  GET  /notifications/status                   — WA microservice health status (proxy)
  GET  /notifications/wa/session               — WA session status (proxy)
  POST /notifications/wa/session/init          — Init WA session (proxy)
  POST /notifications/wa/session/logout        — Logout WA session (proxy)
  DELETE /notifications/wa/session             — Destroy WA session (proxy)
  GET  /notifications/wa/session/qr            — QR code raw string (proxy, one-shot)
  GET  /notifications/wa/queue                 — Queue stats (proxy)
  GET  /notifications/wa/logs                  — WA delivery logs (proxy)
  POST /notifications/webhook/whatsapp         — Webhook callback dari WA microservice

  ── CRON / TRIGGER ──────────────────────────────────────────────────────────
  POST /notifications/cron/payment-reminder-monday — Cron pengingat bayar formulir (Senin)
  POST /notifications/trigger/wave-closed          — Trigger kuota penuh/penutupan gelombang
  POST /notifications/webhook/tiu-result           — Webhook Apps Script nilai TIU

WA calls harus SELALU melalui FastAPI — frontend tidak boleh memanggil
WA microservice langsung karena itu akan mengekspos WA_API_KEY di browser.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import hmac
import logging
import time
import uuid
from typing import Any, cast
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from src.core.config import settings
from src.core.database import execute_raw, get_by_id, get_raw_pool, update_record
from src.core.dependencies import (
    require_cron_auth,
    require_notification_admin,
    require_notification_read,
)
from src.core.notif_service import send_custom_notifications, send_notification

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
    perPage: int = Query(20, ge=1, le=200),
    status: str | None = Query(None),
    event_key: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    offset = (page - 1) * perPage
    where_parts: list[str] = ["1=1"]
    params: dict[str, Any] = {}

    if status:
        where_parts.append("status = :status")
        params["status"] = status
    if event_key:
        where_parts.append("event_key = :event_key")
        params["event_key"] = event_key

    where_clause = " AND ".join(where_parts)
    data_sql = (
        f"SELECT * FROM notification_logs WHERE {where_clause} "
        "ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    )
    count_sql = f"SELECT COUNT(*) as cnt FROM notification_logs WHERE {where_clause}"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(data_sql), params).mappings().all()
        count_rows = (
            conn.execute(
                text(count_sql),
                {k: v for k, v in params.items() if k not in ("limit", "offset")},
            )
            .mappings()
            .all()
        )

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


# ── WA Microservice Proxy ─────────────────────────────────────────────────────
#
# Semua calls ke WA microservice harus lewat sini — frontend TIDAK BOLEH
# memanggil WA service langsung karena itu akan expose WA_API_KEY di browser.


async def _wa_proxy(
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: float = 10.0,
) -> dict[str, Any]:
    """Helper: forward request ke WA microservice dengan API key dari server."""
    import httpx

    if not settings.wa_service_url or not settings.wa_service_api_key:
        raise HTTPException(
            status_code=503,
            detail="WA_SERVICE_URL atau WA_SERVICE_API_KEY belum dikonfigurasi",
        )

    url = f"{settings.wa_service_url.rstrip('/')}{path}"
    headers = {
        "Authorization": f"Bearer {settings.wa_service_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
            )
            data = resp.json() if resp.content else {}
            if not resp.is_success:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=data.get("error")
                    or data.get("message")
                    or f"WA service error {resp.status_code}",
                )
            return cast(dict[str, Any], data)
    except HTTPException:
        raise
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503, detail="WA microservice tidak dapat dihubungi"
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/wa/session")
async def wa_get_session(user: dict = Depends(require_notification_read)):
    return await _wa_proxy("GET", "/api/session")


@router.post("/wa/session/init")
async def wa_init_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("POST", "/api/session/init")


@router.post("/wa/session/logout")
async def wa_logout_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("POST", "/api/session/logout")


@router.delete("/wa/session")
async def wa_destroy_session(user: dict = Depends(require_notification_admin)):
    return await _wa_proxy("DELETE", "/api/session")


@router.get("/wa/session/qr")
async def wa_get_qr_image(user: dict = Depends(require_notification_read)):
    """One-shot raw QR string (dirender frontend via QR JS library)."""
    return await _wa_proxy("GET", "/api/session/qr/raw", timeout=15.0)


@router.get("/wa/queue")
async def wa_get_queue(user: dict = Depends(require_notification_read)):
    return await _wa_proxy("GET", "/api/messages/queue")


@router.get("/wa/logs")
async def wa_get_logs(
    page: int = Query(1, ge=1),
    perPage: int = Query(20, ge=1, le=200),
    status: str | None = Query(None),
    user: dict = Depends(require_notification_read),
):
    params: dict[str, Any] = {"page": page, "perPage": perPage}
    if status:
        params["status"] = status
    return await _wa_proxy("GET", "/api/messages/logs", params=params)


# ── Webhook Endpoint (callback dari WA microservice) ─────────────────────────


def _verify_wa_webhook(body_bytes: bytes, timestamp: str, signature: str) -> bool:
    """
    Verifikasi HMAC-SHA256 signature dari WA microservice.

    FAIL-CLOSED: jika WA_WEBHOOK_SECRET tidak dikonfigurasi, TOLAK semua
    request (bukan terima). Ini mencegah spoofing webhook.
    """
    secret = settings.wa_webhook_secret
    if not secret:
        logger.error(
            "WA_WEBHOOK_SECRET tidak dikonfigurasi — menolak semua webhook. "
            "Set WA_WEBHOOK_SECRET di .env untuk mengaktifkan webhook."
        )
        return False  # FAIL-CLOSED

    # Check timestamp tidak terlalu lama (max 5 menit) — cegah replay attack
    try:
        ts_int = int(timestamp)
        if abs(time.time() - ts_int) > 300:
            logger.warning(
                "Webhook timestamp terlalu lama atau tidak valid",
                extra={"timestamp": timestamp},
            )
            return False
    except (ValueError, TypeError):
        return False

    # FIX: pakai hmac.new() yang benar (bukan hmac.new tanpa panggilan)
    # signature format dari WA service: "sha256=<hex>"
    try:
        message = f"{timestamp}.{body_bytes.decode('utf-8', errors='replace')}".encode()
        expected = hmac.new(
            secret.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()
    except Exception:
        logger.exception("Gagal menghitung HMAC signature")
        return False

    # Constant-time comparison untuk mencegah timing attack
    provided = signature.removeprefix("sha256=")
    if not provided:
        return False
    return hmac.compare_digest(expected, provided)


@router.post("/webhook/whatsapp")
async def wa_webhook(request: Request):
    """
    Menerima delivery status callback dari WA microservice.
    Update notification_logs berdasarkan event yang diterima.
    """
    # Baca body mentah terlebih dahulu — decode aman dengan error replacement
    try:
        body_bytes = await request.body()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read request body")

    signature = request.headers.get("X-WA-Signature", "")
    timestamp = request.headers.get("X-WA-Timestamp", "")

    if not _verify_wa_webhook(body_bytes, timestamp, signature):
        logger.warning(
            "Webhook ditolak: signature tidak valid atau secret belum dikonfigurasi",
            extra={"signature_present": bool(signature), "timestamp": timestamp},
        )
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        import json

        payload = json.loads(body_bytes.decode("utf-8", errors="replace"))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    event = payload.get("event")
    data = payload.get("data", {})

    pool = get_raw_pool()
    with pool.connect() as conn:
        if event == "message.sent":
            # FIX: Update by job_id saja — tidak boleh pakai OR event_key
            # karena akan mengupdate log yang salah.
            # notification_logs.id punya prefix "notiflog-" sehingga kita
            # simpan job_id di kolom wa_message_id saat enqueue (future).
            # Untuk sekarang: update baris terbaru yang matching event_key
            # DAN masih dalam status queued, dibatasi 1 baris.
            job_id = data.get("jobId")
            wa_message_id = data.get("waMessageId")
            event_key = data.get("eventKey", "")
            recipient_user_id = data.get("recipientUserId", "")

            if job_id and event_key:
                conn.execute(
                    text(
                        "UPDATE notification_logs "
                        "SET status = 'sent', wa_message_id = :wa_id, sent_at = NOW() "
                        "WHERE event_key = :event_key "
                        "AND recipient_user_id = :user_id "
                        "AND status = 'queued' "
                        "ORDER BY created_at DESC "
                        "LIMIT 1"
                    ),
                    {
                        "wa_id": wa_message_id,
                        "event_key": event_key,
                        "user_id": recipient_user_id,
                    },
                )
                conn.commit()
                logger.info("Webhook: message.sent — jobId=%s", job_id)

        elif event == "message.failed":
            job_id = data.get("jobId")
            error_code = data.get("errorCode", "unknown")
            error_msg = data.get("errorMessage", "")
            event_key = data.get("eventKey", "")
            recipient_user_id = data.get("recipientUserId", "")
            status = "invalid_number" if error_code == "invalid_number" else "failed"

            if job_id and event_key:
                conn.execute(
                    text(
                        "UPDATE notification_logs "
                        "SET status = :status, error_message = :msg "
                        "WHERE event_key = :event_key "
                        "AND recipient_user_id = :user_id "
                        "AND status = 'queued' "
                        "ORDER BY created_at DESC "
                        "LIMIT 1"
                    ),
                    {
                        "status": status,
                        "msg": f"{error_code}: {error_msg}",
                        "event_key": event_key,
                        "user_id": recipient_user_id,
                    },
                )
                conn.commit()
                logger.info(
                    "Webhook: message.failed — jobId=%s, code=%s", job_id, error_code
                )

        elif event == "session.ready":
            logger.info("Webhook: WA session is ready")
        elif event == "session.disconnected":
            logger.warning(
                "Webhook: WA session disconnected — reason=%s", data.get("reason")
            )

    return JSONResponse({"received": True, "event": event})


# ── CRON: Pengingat Bayar Formulir Setiap Senin ───────────────────────────────


class MondayReminderRequest(BaseModel):
    """Body opsional — semua field punya default (cron bisa POST tanpa body)."""

    dry_run: bool = False  # True = hitung dan return count, tapi jangan kirim notif
    limit: int | None = None  # Batasi jumlah penerima (debug/testing)


@router.post("/cron/payment-reminder-monday")
async def cron_payment_reminder_monday(
    body: MondayReminderRequest = MondayReminderRequest(),
    _: dict = Depends(require_cron_auth),
):
    """
    Endpoint cron yang dipanggil setiap hari Senin.

    Mencari semua pendaftar yang:
      1. Status applicant: 'pending_payment'
      2. payment_status: 'pending'
      3. deleted_at IS NULL (akun belum expired)
      4. Gelombang masih buka (status = 'active', end_date >= TODAY)
      5. Belum menerima reminder 'payment_reminder_monday' dalam 7 hari terakhir
         (mencegah dobel kirim kalau cron dipanggil lebih dari sekali seminggu)

    Mengirim notifikasi payment_reminder_monday ke masing-masing pendaftar.
    Idempoten: cek riwayat log sebelum kirim.

    Keamanan: endpoint ini dilindungi require_cron_auth (CRON_SECRET di .env).
    Hanya dapat dipanggil oleh scheduler eksternal (cron job), bukan user biasa.
    """
    pool = get_raw_pool()
    with pool.connect() as conn:
        # Ambil semua pendaftar yang memenuhi syarat
        # Join ke ppdb_waves untuk memastikan gelombang masih aktif
        rows = (
            conn.execute(
                text(
                    """
                SELECT
                    pa.id            AS applicant_id,
                    pa.user_id,
                    pa.full_name,
                    pa.phone,
                    w.name           AS wave_name,
                    w.end_date       AS wave_end_date
                FROM ppdb_applicants pa
                JOIN ppdb_waves w ON w.id = pa.wave_id
                WHERE pa.status = 'pending_payment'
                  AND pa.payment_status = 'pending'
                  AND pa.deleted_at IS NULL
                  AND w.status = 'active'
                  AND (w.end_date IS NULL OR w.end_date >= CURDATE())
                ORDER BY pa.created_at ASC
                """
                )
            )
            .mappings()
            .all()
        )

    eligible = [dict(r) for r in rows]

    if body.limit is not None:
        eligible = eligible[: body.limit]

    if not eligible:
        return {
            "message": "Tidak ada pendaftar yang memenuhi syarat",
            "total_eligible": 0,
            "sent": 0,
            "skipped_recent": 0,
            "dry_run": body.dry_run,
        }

    # Filter: skip jika sudah kirim dalam 7 hari terakhir
    user_ids_eligible = [r["user_id"] for r in eligible]
    sent_count = 0
    skipped_recent = 0

    with pool.connect() as conn:
        # Bulk check riwayat 7 hari terakhir
        placeholders = ", ".join(f":uid{i}" for i in range(len(user_ids_eligible)))
        uid_params = {f"uid{i}": uid for i, uid in enumerate(user_ids_eligible)}
        recent_rows = (
            conn.execute(
                text(
                    f"""
                SELECT recipient_user_id
                FROM notification_logs
                WHERE event_key = 'payment_reminder_monday'
                  AND recipient_user_id IN ({placeholders})
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                  AND status IN ('sent', 'queued')
                """
                ),
                uid_params,
            )
            .mappings()
            .all()
        )
        recently_notified = {str(r["recipient_user_id"]) for r in recent_rows}

    for r in eligible:
        user_id = str(r["user_id"])
        if user_id in recently_notified:
            skipped_recent += 1
            continue

        if not body.dry_run:
            # Format tanggal tutup gelombang
            wave_end = r.get("wave_end_date")
            tanggal_tutup = (
                wave_end.strftime("%d %B %Y") if wave_end else "sesuai jadwal"
            )

            send_notification(
                event_key="payment_reminder_monday",
                recipient_user_id=user_id,
                context={
                    "nama_gelombang": r.get("wave_name", ""),
                    "tanggal_tutup": tanggal_tutup,
                    "link_pembayaran": f"{settings.ppdb_frontend_url}/payment",
                },
            )
        sent_count += 1

    logger.info(
        "Cron payment_reminder_monday: eligible=%d, sent=%d, skipped=%d, dry_run=%s",
        len(eligible),
        sent_count,
        skipped_recent,
        body.dry_run,
    )

    return {
        "message": "Selesai"
        if not body.dry_run
        else "Dry run — tidak ada yang dikirim",
        "total_eligible": len(eligible),
        "sent": sent_count,
        "skipped_recent": skipped_recent,
        "dry_run": body.dry_run,
    }


# ── CRON: Pengingat Bayar DP Mingguan (3 bulan sejak lulus) ─────────────────


class DPReminderRequest(BaseModel):
    """Body opsional untuk cron pengingat DP mingguan."""

    dry_run: bool = False
    limit: int | None = None


@router.post("/cron/dp-payment-reminder")
async def cron_dp_payment_reminder(
    body: DPReminderRequest = DPReminderRequest(),
    _: dict = Depends(require_cron_auth),
):
    """
    Cron mingguan: kirim pengingat bayar DP ke pendaftar yang sudah LULUS
    tapi belum menyelesaikan pembayaran DP dalam batas 3 bulan.

    Kriteria penerima:
      1. applicant.status = 'passed'
      2. Ada tagihan ppdb_stage2_bills berstatus 'pending' (belum bayar)
      3. Belum lewat 3 bulan sejak applicant.updated_at (waktu lulus)
      4. Belum menerima dp_payment_reminder dalam 7 hari terakhir (idempoten)

    Keamanan: dilindungi require_cron_auth (CRON_SECRET di .env).
    """
    pool = get_raw_pool()

    with pool.connect() as conn:
        rows = (
            conn.execute(
                text(
                    """
                SELECT DISTINCT
                    pa.id           AS applicant_id,
                    pa.user_id,
                    pa.full_name,
                    pa.updated_at   AS passed_at
                FROM ppdb_applicants pa
                JOIN ppdb_stage2_bills b ON b.applicant_id = pa.id
                WHERE pa.status = 'passed'
                  AND b.status = 'pending'
                  AND pa.deleted_at IS NULL
                  AND pa.updated_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                ORDER BY pa.updated_at ASC
                """
                )
            )
            .mappings()
            .all()
        )

    eligible = [dict(r) for r in rows]
    if body.limit is not None:
        eligible = eligible[: body.limit]

    if not eligible:
        return {
            "message": "Tidak ada pendaftar yang memenuhi syarat",
            "total_eligible": 0,
            "sent": 0,
            "skipped_recent": 0,
            "dry_run": body.dry_run,
        }

    # Idempoten: skip jika sudah kirim dalam 7 hari terakhir
    user_ids = [r["user_id"] for r in eligible]
    with pool.connect() as conn:
        placeholders = ", ".join(f":uid{i}" for i in range(len(user_ids)))
        uid_params = {f"uid{i}": uid for i, uid in enumerate(user_ids)}
        recent_rows = (
            conn.execute(
                text(
                    f"""
                SELECT recipient_user_id
                FROM notification_logs
                WHERE event_key = 'dp_payment_reminder'
                  AND recipient_user_id IN ({placeholders})
                  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                  AND status IN ('sent', 'queued')
                """
                ),
                uid_params,
            )
            .mappings()
            .all()
        )
    recently_notified = {str(r["recipient_user_id"]) for r in recent_rows}

    sent_count = 0
    skipped_recent = 0

    for r in eligible:
        user_id = str(r["user_id"])
        if user_id in recently_notified:
            skipped_recent += 1
            continue

        if not body.dry_run:
            # Hitung sisa waktu: 90 hari sejak lulus
            import datetime as _dt

            passed_at = r.get("passed_at")
            if passed_at:
                deadline = (
                    passed_at + _dt.timedelta(days=90)
                    if isinstance(passed_at, _dt.datetime)
                    else _dt.datetime.now()
                )
                tanggal_jatuh_tempo = deadline.strftime("%d %B %Y")
                hari_tersisa = (deadline - _dt.datetime.now()).days
                sisa_waktu = (
                    f"{hari_tersisa} hari lagi"
                    if hari_tersisa > 0
                    else "hari ini (segera!)"
                )
            else:
                tanggal_jatuh_tempo = "—"
                sisa_waktu = "—"

            send_notification(
                event_key="dp_payment_reminder",
                recipient_user_id=user_id,
                context={
                    "sisa_waktu": sisa_waktu,
                    "tanggal_jatuh_tempo": tanggal_jatuh_tempo,
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                },
            )
        sent_count += 1

    logger.info(
        "Cron dp_payment_reminder: eligible=%d, sent=%d, skipped=%d, dry_run=%s",
        len(eligible),
        sent_count,
        skipped_recent,
        body.dry_run,
    )

    return {
        "message": "Selesai"
        if not body.dry_run
        else "Dry run — tidak ada yang dikirim",
        "total_eligible": len(eligible),
        "sent": sent_count,
        "skipped_recent": skipped_recent,
        "dry_run": body.dry_run,
    }


# ── TRIGGER: Gelombang Ditutup / Kuota Penuh ────────────────────────────────


class WaveClosedTriggerRequest(BaseModel):
    """Payload dikirim saat gelombang ditutup (kuota penuh atau tanggal berakhir)."""

    wave_id: str  # ID gelombang yang ditutup
    reason: str = "quota_full"  # quota_full | date_expired | manual


@router.post("/trigger/wave-closed")
async def trigger_wave_closed(
    body: WaveClosedTriggerRequest,
    _: dict = Depends(require_notification_admin),
):
    """
    Trigger notifikasi wave_closed_pending_payment ke semua pendaftar
    yang tagihan formulirnya masih pending saat gelombang ditutup.

    Dipanggil oleh:
    - ppdb_service.close_wave() saat kuota tercapai / tanggal berakhir
    - Admin saat menutup gelombang secara manual

    Alur:
    1. Ambil semua pendaftar dengan status 'pending_payment' di wave tersebut
    2. Batalkan ppdb_payment_transactions yang masih pending
    3. Set applicant.status = 'expired' dan payment_status = 'failed'
    4. Kirim notifikasi wave_closed_pending_payment ke masing-masing

    Idempoten: pendaftar yang sudah 'expired'/'paid' dilewati.
    """
    if not body.wave_id:
        raise HTTPException(status_code=400, detail="wave_id tidak boleh kosong")

    pool = get_raw_pool()

    # 1. Ambil data gelombang
    with pool.connect() as conn:
        wave_rows = (
            conn.execute(
                text("SELECT id, name, period_id FROM ppdb_waves WHERE id = :wid"),
                {"wid": body.wave_id},
            )
            .mappings()
            .all()
        )

    if not wave_rows:
        raise HTTPException(status_code=404, detail="Gelombang tidak ditemukan")
    wave = dict(wave_rows[0])

    # 2. Ambil pendaftar yang masih pending_payment di gelombang ini
    with pool.connect() as conn:
        applicant_rows = (
            conn.execute(
                text(
                    """
                SELECT pa.id, pa.user_id, pa.full_name, pa.phone
                FROM ppdb_applicants pa
                WHERE pa.wave_id = :wid
                  AND pa.status = 'pending_payment'
                  AND pa.payment_status = 'pending'
                  AND pa.deleted_at IS NULL
                """
                ),
                {"wid": body.wave_id},
            )
            .mappings()
            .all()
        )

    applicants = [dict(r) for r in applicant_rows]
    cancelled_count = 0
    notified_count = 0

    if applicants:
        with pool.connect() as conn:
            for ap in applicants:
                # 3. Batalkan semua transaksi pending untuk applicant ini
                conn.execute(
                    text(
                        """
                        UPDATE ppdb_payment_transactions
                        SET status = 'cancelled',
                            failure_reason = :reason,
                            updated_at = NOW()
                        WHERE applicant_id = :aid
                          AND status = 'pending'
                        """
                    ),
                    {
                        "aid": ap["id"],
                        "reason": f"Gelombang ditutup: {body.reason}",
                    },
                )

                # 4. Update status pendaftar → expired
                conn.execute(
                    text(
                        """
                        UPDATE ppdb_applicants
                        SET status = 'expired',
                            payment_status = 'failed',
                            updated_at = NOW()
                        WHERE id = :aid
                          AND status = 'pending_payment'
                        """
                    ),
                    {"aid": ap["id"]},
                )
                cancelled_count += 1

            conn.commit()

        # 5. Kirim notifikasi (fire-and-forget, tidak block response)
        for ap in applicants:
            send_notification(
                event_key="wave_closed_pending_payment",
                recipient_user_id=str(ap["user_id"]),
                context={
                    "nama_gelombang": wave["name"],
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                },
            )
            notified_count += 1

    logger.info(
        "Trigger wave_closed: wave=%s, reason=%s, cancelled=%d, notified=%d",
        body.wave_id,
        body.reason,
        cancelled_count,
        notified_count,
    )

    return {
        "message": "Proses penutupan gelombang selesai",
        "wave_id": body.wave_id,
        "wave_name": wave["name"],
        "reason": body.reason,
        "cancelled_invoices": cancelled_count,
        "notified": notified_count,
    }


# ── WEBHOOK: TIU Apps Script ─────────────────────────────────────────────────


def _verify_tiu_webhook(provided_secret: str) -> bool:
    """
    Verifikasi webhook dari Google Apps Script.

    Apps Script mengirim header X-TIU-Secret: <nilai secret>.
    Secret dibaca dari pengaturan global backoffice (site_settings key
    'ppdb_tiu_webhook_secret'), dengan fallback ke TIU_WEBHOOK_SECRET di .env.

    FAIL-CLOSED: jika tidak ada secret yang dikonfigurasi, TOLAK semua.

    Tidak memakai body bytes — FastAPI sudah mengonsumsi body untuk mem-parse
    Pydantic model sebelum fungsi ini dipanggil, sehingga membaca ulang body
    akan menghasilkan bytes kosong. Header secret sudah cukup untuk otentikasi
    Apps Script internal.
    """
    try:
        configured = execute_raw(
            "SELECT `value` FROM `site_settings` WHERE `key` = :key LIMIT 1",
            {"key": "ppdb_tiu_webhook_secret"},
        )
    except Exception:
        logger.exception("Gagal membaca secret TIU dari pengaturan global")
        configured = []
    expected = (
        configured[0].get("value") if configured else None
    ) or settings.tiu_webhook_secret
    if not expected:
        logger.error(
            "TIU_WEBHOOK_SECRET tidak dikonfigurasi — menolak semua webhook TIU. "
            "Set TIU_WEBHOOK_SECRET di .env atau atur di backoffice."
        )
        return False
    return hmac.compare_digest(expected.strip(), provided_secret.strip())


class TIUResultWebhookPayload(BaseModel):
    """Payload dari Google Apps Script saat nilai TIU selesai."""

    # Identitas — wajib salah satu atau keduanya
    applicant_id: str | None = None
    attempt_id: str | None = None

    # Nilai TIU
    score: float = Field(ge=0, le=100)  # nilai 0–100

    # Metadata opsional
    completed_at: str | None = None  # ISO 8601
    answers_summary: dict[str, Any] | None = None  # ringkasan jawaban (opsional)

    # Idempotency key — Apps Script wajib mengirim untuk mencegah duplikat
    idempotency_key: str = Field(min_length=1, max_length=200)


@router.post("/webhook/tiu-result")
async def tiu_result_webhook(
    request: Request,
    payload: TIUResultWebhookPayload,
):
    """
    Webhook dari Google Apps Script saat nilai TIU tersedia.

    Alur:
    1. Validasi X-TIU-Secret header
    2. Cek idempotency_key di tabel tiu_webhook_idempotency (atau notification_logs)
       — jika sudah ada, kembalikan 200 tanpa proses ulang
    3. Resolve applicant dari applicant_id atau attempt_id
    4. Simpan/update nilai TIU di tabel tiu_attempts
    5. Kirim notifikasi WhatsApp tiu_result_ready ke pendaftar
    6. Rekam idempotency_key agar retry tidak duplikat

    Keamanan:
    - Header X-TIU-Secret cocok dengan secret global backoffice atau fallback .env
    - Idempoten: replay/retry dengan key yang sama diabaikan
    - Webhook gagal tidak memicu notifikasi (fail-closed)
    """
    # 1. Validasi secret (cukup dari header — body sudah diparse Pydantic)
    provided_secret = request.headers.get("X-TIU-Secret", "")
    if not _verify_tiu_webhook(provided_secret):
        logger.warning(
            "TIU webhook ditolak: secret tidak valid atau tidak dikonfigurasi"
        )
        raise HTTPException(status_code=401, detail="Invalid TIU webhook secret")

    if not payload.applicant_id and not payload.attempt_id:
        raise HTTPException(
            status_code=422,
            detail="Wajib menyertakan applicant_id atau attempt_id",
        )

    pool = get_raw_pool()

    # 2. Cek idempotency — gunakan notification_logs dengan event_key khusus
    #    sebagai penyimpanan idempotency yang sederhana
    with pool.connect() as conn:
        existing = (
            conn.execute(
                text(
                    """
                SELECT id FROM tiu_results
                WHERE idempotency_key = :ikey
                LIMIT 1
                """
                ),
                {"ikey": payload.idempotency_key},
            )
            .mappings()
            .all()
        )

    if existing:
        logger.info(
            "TIU webhook duplikat diabaikan: idempotency_key=%s",
            payload.idempotency_key,
        )
        return JSONResponse(
            status_code=200,
            content={
                "received": True,
                "duplicate": True,
                "message": "Sudah diproses sebelumnya",
            },
        )

    # 3. Resolve applicant
    applicant: dict[str, Any] | None = None
    with pool.connect() as conn:
        attempt_table = conn.execute(text("SHOW TABLES LIKE 'tiu_attempts'")).fetchall()
        if payload.attempt_id and not attempt_table:
            raise HTTPException(
                status_code=503,
                detail="Penyimpanan attempt TIU belum tersedia di server.",
            )
        if payload.applicant_id:
            rows = (
                conn.execute(
                    text(
                        "SELECT pa.id, pa.user_id, pa.full_name, pa.phone "
                        "FROM ppdb_applicants pa WHERE pa.id = :aid"
                    ),
                    {"aid": payload.applicant_id},
                )
                .mappings()
                .all()
            )
            if rows:
                applicant = dict(rows[0])

        if applicant is None and payload.attempt_id:
            # attempt_id → applicant_id lewat tiu_attempts jika tabel ada
            rows = (
                conn.execute(
                    text(
                        """
                    SELECT pa.id, pa.user_id, pa.full_name, pa.phone
                    FROM ppdb_applicants pa
                    JOIN tiu_attempts ta ON ta.applicant_id = pa.id
                    WHERE ta.id = :atid
                    """
                    ),
                    {"atid": payload.attempt_id},
                )
                .mappings()
                .all()
            )
            if rows:
                applicant = dict(rows[0])

    if applicant is None:
        logger.warning(
            "TIU webhook: pendaftar tidak ditemukan (applicant_id=%s, attempt_id=%s)",
            payload.applicant_id,
            payload.attempt_id,
        )
        raise HTTPException(
            status_code=404,
            detail="Pendaftar tidak ditemukan berdasarkan applicant_id/attempt_id yang diberikan",
        )

    applicant_id = applicant["id"]
    user_id = str(applicant["user_id"])

    # 4. Persist one result per applicant, atomically with the attempt update
    #    when the TIU attempt subsystem is present.
    tiu_saved = False
    with pool.connect() as conn:
        try:
            if attempt_table:
                if payload.attempt_id:
                    update_result = conn.execute(
                        text(
                            """
                            UPDATE tiu_attempts
                            SET score = :score,
                                status = 'completed',
                                completed_at = NOW(),
                                updated_at = NOW()
                            WHERE id = :atid AND applicant_id = :aid
                              AND status IN ('started', 'pending')
                            """
                        ),
                        {
                            "score": payload.score,
                            "atid": payload.attempt_id,
                            "aid": applicant_id,
                        },
                    )
                else:
                    update_result = conn.execute(
                        text(
                            """
                            UPDATE tiu_attempts
                            SET score = :score,
                                status = 'completed',
                                completed_at = NOW(),
                                updated_at = NOW()
                            WHERE applicant_id = :aid
                              AND status IN ('started', 'pending')
                            ORDER BY created_at DESC
                            LIMIT 1
                            """
                        ),
                        {
                            "score": payload.score,
                            "aid": applicant_id,
                        },
                    )
                if update_result.rowcount != 1:
                    raise HTTPException(
                        status_code=409,
                        detail="Attempt TIU tidak ditemukan atau sudah selesai.",
                    )

            now_wib = _dt.datetime.now(ZoneInfo("Asia/Jakarta")).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            conn.execute(
                text(
                    """
                    INSERT INTO tiu_results
                        (id, applicant_id, attempt_id, idempotency_key, score,
                         completed_at, created_at)
                    VALUES
                        (:id, :aid, :atid, :ikey, :score,
                         NOW(), :created_at)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "aid": applicant_id,
                    "atid": payload.attempt_id,
                    "ikey": payload.idempotency_key,
                    "score": payload.score,
                    "created_at": now_wib,
                },
            )
            conn.commit()
            tiu_saved = True
        except IntegrityError:
            conn.rollback()
            with pool.connect() as check_conn:
                duplicate = check_conn.execute(
                    text(
                        "SELECT id FROM tiu_results WHERE idempotency_key = :ikey LIMIT 1"
                    ),
                    {"ikey": payload.idempotency_key},
                ).first()
            if duplicate:
                return JSONResponse(
                    status_code=200,
                    content={
                        "received": True,
                        "duplicate": True,
                        "message": "Sudah diproses sebelumnya",
                    },
                )
            raise HTTPException(
                status_code=409,
                detail="Hasil TIU untuk pendaftar ini sudah tersimpan.",
            )
        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception(
                "Gagal menyimpan hasil TIU (applicant=%s)",
                applicant_id,
            )
            raise HTTPException(
                status_code=503,
                detail="Hasil TIU gagal disimpan. Pengirim boleh mencoba ulang.",
            ) from exc

    # 5. Rekam idempotency key di notification_logs
    #    Kita pakai kolom subject_sent untuk menyimpan idempotency_key
    from src.core.database import create_record

    now_wib = _dt.datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
    try:
        create_record(
            "notification_logs",
            {
                "id": f"notiflog-tiu-{uuid.uuid4()}",
                "template_id": None,
                "event_key": "tiu_result_webhook_processed",
                "recipient_user_id": user_id,
                "recipient_name": applicant.get("full_name", ""),
                "recipient_email": "",
                "recipient_phone": str(applicant.get("phone", "")),
                "channel": "system",
                "subject_sent": payload.idempotency_key,  # simpan sebagai idempotency store
                "body_sent": f"score={payload.score}, attempt_id={payload.attempt_id}, applicant_id={applicant_id}",
                "status": "sent",
                "retry_count": 0,
                "sent_at": now_wib,
                "error_message": None,
                "created_at": now_wib,
            },
            return_row=False,
        )
    except Exception:
        logger.exception("Gagal menyimpan idempotency record untuk TIU webhook")

    # 6. Kirim notifikasi WhatsApp tiu_result_ready
    send_notification(
        event_key="tiu_result_ready",
        recipient_user_id=user_id,
        context={
            "nilai_tiu": str(int(payload.score))
            if payload.score == int(payload.score)
            else str(payload.score),
            "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
        },
    )

    logger.info(
        "TIU webhook berhasil diproses: applicant=%s, score=%.2f, tiu_saved=%s",
        applicant_id,
        payload.score,
        tiu_saved,
    )

    return JSONResponse(
        status_code=200,
        content={
            "received": True,
            "duplicate": False,
            "applicant_id": applicant_id,
            "score": payload.score,
            "tiu_saved": tiu_saved,
            "notification_queued": True,
            "message": "Nilai TIU berhasil diproses dan notifikasi diantrekan",
        },
    )
