import sys
import uuid
import datetime
from zoneinfo import ZoneInfo
sys.path.insert(0, ".")
from src.core.database import get_raw_pool, create_record, execute_raw
from sqlalchemy import text

pool = get_raw_pool()
now_wib = datetime.datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")

with pool.connect() as conn:
    applicants = conn.execute(text("SELECT id, payment_status, created_at FROM ppdb_applicants")).mappings().all()

    for app in applicants:
        txs = conn.execute(
            text("SELECT id FROM ppdb_payment_transactions WHERE applicant_id = :aid"),
            {"aid": app["id"]}
        ).mappings().all()
        
        if not txs:
            # Create a pending transaction for them
            tx_id = f"pay-{uuid.uuid4()}"
            status = app["payment_status"]
            if not status:
                status = "pending"
            conn.execute(
                text("""
                    INSERT INTO ppdb_payment_transactions 
                    (id, applicant_id, method, amount, status, created_at, updated_at)
                    VALUES (:id, :aid, 'offline', 0, :status, :created, :updated)
                """),
                {
                    "id": tx_id,
                    "aid": app["id"],
                    "status": status,
                    "created": app["created_at"],
                    "updated": now_wib
                }
            )
            print(f"Created backfill tx for applicant {app['id']}")
    conn.commit()
print("Backfill complete.")
