import logging
from sqlalchemy import text
from src.core.database import get_raw_pool, create_record
import uuid
import datetime
from zoneinfo import ZoneInfo

logger = logging.getLogger("ptdarrahman.notif")


def send_notification(event_key: str, recipient_user_id: str, context: dict):
    return send_notifications([(event_key, context)], recipient_user_id)


def send_notifications(events, recipient_user_id: str, user_row=None, applicant_row=None):
    """Kirim beberapa notif sekaligus dengan satu set lookup (template/user/applicant).

    events: list of (event_key, context). user_row/applicant_row opsional untuk
    memakai data yang sudah ada di memori (mis. hasil create_record di register),
    sehingga memangkas query DB yang berurutan.
    """
    if not events:
        return

    keys = [k for k, _ in events]
    pool = get_raw_pool()

    with pool.connect() as conn:
        placeholders = ", ".join(f":k{i}" for i in range(len(keys)))
        params = {f"k{i}": k for i, k in enumerate(keys)}
        rows = conn.execute(
            text(f"SELECT * FROM notification_templates WHERE event_key IN ({placeholders})"),
            params,
        ).mappings().all()
        templates = {r["event_key"]: dict(r) for r in rows}

        if user_row is not None:
            user = user_row
        else:
            user_rows = conn.execute(
                text("SELECT * FROM users WHERE id = :id"), {"id": recipient_user_id}
            ).mappings().all()
            user = user_rows[0] if user_rows else None

        if user is None:
            logger.warning(f"User {recipient_user_id} not found. Skipping notification.")
            return

        if applicant_row is not None:
            applicant = applicant_row
        else:
            applicant_rows = conn.execute(
                text("SELECT * FROM ppdb_applicants WHERE user_id = :id"), {"id": recipient_user_id}
            ).mappings().all()
            applicant = applicant_rows[0] if applicant_rows else {}

        for event_key, context in events:
            template = templates.get(event_key)
            if not template or not template.get("is_active"):
                logger.info(f"Template {event_key} not found or inactive. Skipping notification.")
                continue

            # Merge context
            ctx = {
                "nama_peserta": applicant.get("full_name") or user.get("full_name", ""),
                "username": user.get("username", ""),
                **context,
            }

            # Render template
            subject = template.get("email_subject") or ""
            body = template.get("body") or ""
            for k, v in ctx.items():
                subject = subject.replace(f"{{{k}}}", str(v))
                body = body.replace(f"{{{k}}}", str(v))

            # Log ke notification_logs (langsung berstatus sent; "kirim" masih placeholder)
            now_wib = datetime.datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")

            log_data = {
                "id": f"notiflog-{uuid.uuid4()}",
                "template_id": template["id"],
                "event_key": event_key,
                "recipient_user_id": user["id"],
                "recipient_name": ctx["nama_peserta"],
                "recipient_email": user.get("email", ""),
                "recipient_phone": applicant.get("phone") or user.get("phone", ""),
                "channel": template.get("channel", "email"),
                "subject_sent": subject,
                "body_sent": body,
                "status": "sent",
                "sent_at": now_wib,
                "error_message": None,
            }

            create_record("notification_logs", log_data, return_row=False)
            logger.info(f"Sending {template.get('channel')} to {user.get('email')} : {subject}")


def send_custom_notifications(recipient_user_ids, channel: str, subject: str, body: str, event_key: str = "custom"):
    """Kirim pesan bebas (tanpa template) ke daftar user, lalu catat di notification_logs.

    Tetap simulasi: email/WA belum aktif, hanya menulis log berstatus 'sent'.
    """
    if not recipient_user_ids:
        return {"sent": 0, "total": 0}

    pool = get_raw_pool()
    sent = 0
    now_wib = datetime.datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")

    with pool.connect() as conn:
        for user_id in recipient_user_ids:
            rows = conn.execute(
                text("SELECT * FROM users WHERE id = :id"), {"id": user_id}
            ).mappings().all()
            if not rows:
                continue
            user = dict(rows[0])

            applicant_rows = conn.execute(
                text("SELECT * FROM ppdb_applicants WHERE user_id = :id"), {"id": user_id}
            ).mappings().all()
            applicant = dict(applicant_rows[0]) if applicant_rows else {}

            log_data = {
                "id": f"notiflog-{uuid.uuid4()}",
                "template_id": None,
                "event_key": event_key,
                "recipient_user_id": user["id"],
                "recipient_name": applicant.get("full_name") or user.get("full_name", ""),
                "recipient_email": user.get("email", ""),
                "recipient_phone": applicant.get("phone") or user.get("phone", ""),
                "channel": channel,
                "subject_sent": subject,
                "body_sent": body,
                "status": "sent",
                "sent_at": now_wib,
                "error_message": None,
            }
            create_record("notification_logs", log_data, return_row=False)
            sent += 1

    return {"sent": sent, "total": len(recipient_user_ids)}
