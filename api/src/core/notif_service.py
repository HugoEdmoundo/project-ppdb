import logging
from sqlalchemy import text
from src.core.database import get_raw_pool, create_record, get_by_column
import uuid
import datetime
from zoneinfo import ZoneInfo

logger = logging.getLogger("ptdarrahman.notif")

def send_notification(event_key: str, recipient_user_id: str, context: dict):
    pool = get_raw_pool()
    with pool.connect() as conn:
        template = get_by_column("notification_templates", "event_key", event_key)
        if not template or not template.get("is_active"):
            logger.info(f"Template {event_key} not found or inactive. Skipping notification.")
            return

        user_rows = conn.execute(
            text("SELECT * FROM users WHERE id = :id"), {"id": recipient_user_id}
        ).mappings().all()
        
        if not user_rows:
            logger.warning(f"User {recipient_user_id} not found. Skipping notification.")
            return
            
        user = user_rows[0]
        
        applicant_rows = conn.execute(
            text("SELECT * FROM ppdb_applicants WHERE user_id = :id"), {"id": recipient_user_id}
        ).mappings().all()
        
        applicant = applicant_rows[0] if applicant_rows else {}
        
        # Merge context
        ctx = {
            "nama_peserta": applicant.get("full_name") or user.get("full_name", ""),
            "username": user.get("username", ""),
            **context
        }

        # Render template
        subject = template.get("email_subject") or ""
        body = template.get("body") or ""
        
        for k, v in ctx.items():
            subject = subject.replace(f"{{{k}}}", str(v))
            body = body.replace(f"{{{k}}}", str(v))

        # Log to notification_logs
        now_wib = datetime.datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
        
        log_data = {
            "id": f"notiflog-{uuid.uuid4()}",
            "template_id": template["id"],
            "event_key": event_key,
            "recipient_user_id": user["id"],
            "recipient_name": ctx["nama_peserta"],
            "recipient_email": user.get("email", ""),
            "recipient_phone": applicant.get("phone", ""),
            "channel": template.get("channel", "email"),
            "subject_sent": subject,
            "body_sent": body,
            "status": "pending",
            "sent_at": None,
            "error_message": None,
        }
        
        created_log = create_record("notification_logs", log_data)
        
        # Simulate send logic (placeholder for actual SMTP / WA Gateway integration)
        logger.info(f"Sending {template.get('channel')} to {user.get('email')} : {subject}")
        # Mark as sent for now
        update_log_status(created_log["id"], "sent", now_wib)
        
def update_log_status(log_id: str, status: str, sent_at: str = None, error: str = None):
    pool = get_raw_pool()
    with pool.begin() as conn:
        conn.execute(
            text("UPDATE notification_logs SET status = :status, sent_at = :sent_at, error_message = :err WHERE id = :id"),
            {"status": status, "sent_at": sent_at, "err": error, "id": log_id}
        )
