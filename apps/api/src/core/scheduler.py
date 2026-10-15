"""apps/api/src/core/scheduler.py

Automated Scheduler Service for PPDB Ar-Rahman.
Features:
- Background worker thread with Asia/Jakarta timezone.
- Monthly installment reminder on the 5th at 08:00 WIB.
- Concurrency-safe execution (Redis lock or DB idempotency).
- Strict qualification checks (passed, DP paid, remaining_balance > 0).
- Idempotency per applicant per month (no duplicates in the same month).
- Manual/test trigger endpoint for testing without waiting for the 5th.
"""

from __future__ import annotations

import datetime
import logging
import threading
import time
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import get_raw_pool, get_sessionmaker
from src.core.notif_service import send_notification
from src.models.ppdb import PPDBApplicant

logger = logging.getLogger("ptdarrahman.scheduler")
WIB = ZoneInfo("Asia/Jakarta")

_scheduler_running = False
_scheduler_thread: threading.Thread | None = None


def run_monthly_installment_reminders(
    db: Session | None = None,
    dry_run: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    """Execute monthly installment reminder check.

    Recipients must meet:
    1. Status is 'passed' and not soft-deleted.
    2. Has signed LoA.
    3. DP has been paid.
    4. Has remaining balance > 0 (not lunas).
    5. Has not received reminder_installment in the current month (unless force=True).
    """
    should_close_db = False
    if db is None:
        db = get_sessionmaker()()
        should_close_db = True

    try:
        now_wib = datetime.datetime.now(WIB)
        current_month_str = now_wib.strftime("%Y-%m")
        current_month_name = now_wib.strftime("%B %Y")

        # Query passed applicants with signed LoA and not soft-deleted
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.status == "passed",
            PPDBApplicant.is_loa_signed.is_(True),
            PPDBApplicant.deleted_at.is_(None),
        )
        candidates = list(db.scalars(stmt).all())

        from src.repositories.payment_repository import PaymentRepository
        from src.services.payment_service import PaymentService

        repo = PaymentRepository(db)
        service = PaymentService(repo)

        eligible: list[dict[str, Any]] = []

        for app in candidates:
            fin = service.calculate_applicant_financials(app.id)
            # Must have paid DP and have positive remaining balance
            if fin["dp_paid"] and fin["remaining_balance"] > 0 and not fin["is_lunas"]:
                eligible.append(
                    {
                        "applicant": app,
                        "financials": fin,
                    }
                )

        if not eligible:
            logger.info("Monthly installment reminder: 0 eligible applicants found.")
            return {
                "message": "Tidak ada pendaftar yang memenuhi syarat cicilan",
                "total_eligible": 0,
                "sent": 0,
                "skipped_recent": 0,
                "dry_run": dry_run,
            }

        # Check existing logs in current month to prevent duplicate notifications
        pool = get_raw_pool()
        recently_notified: set[str] = set()

        if not force:
            with pool.connect() as conn:
                app_user_ids = [str(e["applicant"].user_id) for e in eligible]
                placeholders = ", ".join(f":uid{i}" for i in range(len(app_user_ids)))
                params = {f"uid{i}": uid for i, uid in enumerate(app_user_ids)}
                params["month_prefix"] = f"{current_month_str}%"

                query_str = f"""
                    SELECT recipient_user_id
                    FROM notification_logs
                    WHERE event_key = 'reminder_installment'
                      AND recipient_user_id IN ({placeholders})
                      AND created_at LIKE :month_prefix
                      AND status IN ('sent', 'queued')
                """
                recent_rows = conn.execute(text(query_str), params).mappings().all()
                recently_notified = {str(r["recipient_user_id"]) for r in recent_rows}

        sent_count = 0
        skipped_recent = 0

        for item in eligible:
            app = item["applicant"]
            fin = item["financials"]
            user_id = str(app.user_id)

            if user_id in recently_notified and not force:
                skipped_recent += 1
                continue

            if not dry_run:
                try:
                    sisa_fmt = f"Rp {fin.get('remaining_balance', 0):,}".replace(
                        ",", "."
                    )
                    total_fmt = f"Rp {fin.get('total_obligation', 0):,}".replace(
                        ",", "."
                    )
                    terbayar_fmt = f"Rp {fin.get('total_paid', 0):,}".replace(",", ".")
                    jatuh_tempo = f"5 {current_month_name}"

                    send_notification(
                        event_key="reminder_installment",
                        recipient_user_id=user_id,
                        context={
                            "nama_peserta": app.full_name,
                            "bulan_cicilan": current_month_name,
                            "nominal_cicilan": sisa_fmt,
                            "total_tagihan_loa": total_fmt,
                            "total_pembayaran_terverifikasi": terbayar_fmt,
                            "sisa_tagihan": sisa_fmt,
                            "tanggal_jatuh_tempo": jatuh_tempo,
                            "link_aplikasi": (
                                f"{settings.ppdb_frontend_url}/applicant/pengumuman"
                            ),
                        },
                    )
                    sent_count += 1
                except Exception as exc:
                    logger.exception(
                        "Gagal mengirim reminder_installment untuk user %s: %s",
                        user_id,
                        exc,
                    )
            else:
                sent_count += 1

        logger.info(
            "Monthly installment reminder job completed: "
            "eligible=%d, sent=%d, skipped=%d, dry_run=%s",
            len(eligible),
            sent_count,
            skipped_recent,
            dry_run,
        )

        return {
            "message": "Pengingat cicilan bulanan berhasil diproses"
            if not dry_run
            else "Dry run selesai — tidak ada pesan yang dikirim",
            "total_eligible": len(eligible),
            "sent": sent_count,
            "skipped_recent": skipped_recent,
            "dry_run": dry_run,
        }

    finally:
        if should_close_db:
            db.close()


def _scheduler_loop():
    """Background ticker checking every 30 seconds for 5th of month 08:00 WIB."""
    global _scheduler_running
    logger.info("PPDB Installment Scheduler background runner started (WIB).")

    last_executed_month: str | None = None

    while _scheduler_running:
        try:
            now_wib = datetime.datetime.now(WIB)
            current_month = now_wib.strftime("%Y-%m")

            # Check if today is the 5th of the month at 08:00 AM WIB
            # (within 08:00 - 08:05 window)
            if now_wib.day == 5 and now_wib.hour == 8 and now_wib.minute < 5:
                if last_executed_month != current_month:
                    # Attempt lock via Redis if configured
                    acquired_lock = True
                    try:
                        from src.core.cache import get_redis

                        r = get_redis()
                        if r:
                            lock_key = (
                                f"lock:scheduler:monthly_installment:{current_month}"
                            )
                            acquired_lock = bool(r.set(lock_key, "1", nx=True, ex=7200))
                    except Exception as e:
                        logger.warning(
                            "Redis lock error in scheduler: %s. "
                            "Continuing with in-memory lock.",
                            e,
                        )

                    if acquired_lock:
                        logger.info(
                            "Executing scheduled monthly installment "
                            "reminders for %s...",
                            current_month,
                        )
                        run_monthly_installment_reminders()
                        last_executed_month = current_month

        except Exception as exc:
            logger.error("Error in scheduler background loop: %s", exc)

        # Sleep for 30 seconds
        time.sleep(30)


def start_scheduler():
    global _scheduler_running, _scheduler_thread
    if not _scheduler_running:
        _scheduler_running = True
        _scheduler_thread = threading.Thread(
            target=_scheduler_loop, daemon=True, name="ppdb-scheduler"
        )
        _scheduler_thread.start()


def stop_scheduler():
    global _scheduler_running
    _scheduler_running = False


# Alias for backward and testing compatibility
run_installment_reminders = run_monthly_installment_reminders
