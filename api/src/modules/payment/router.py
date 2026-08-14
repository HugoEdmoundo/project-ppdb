from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from src.core.database import execute_raw, update_record, get_raw_pool, get_by_column
from src.core.dependencies import get_current_user, require_module_access
from datetime import datetime
from zoneinfo import ZoneInfo

router = APIRouter()
WIB = ZoneInfo("Asia/Jakarta")

def require_payment_admin(user: dict = Depends(get_current_user)):
    # Bypassed by superadmin inside get_current_user logic for role_id maybe?
    # Actually require_module_access is better. Let's create a specific guard.
    if user.get("is_superadmin"):
        return user
    
    perms = user.get("permissions", {})
    if perms.get("payment") not in ["crud"]:
        raise HTTPException(status_code=403, detail="Forbidden: Requires payment CRUD access")
    return user

def require_payment_read(user: dict = Depends(get_current_user)):
    if user.get("is_superadmin"):
        return user
    
    perms = user.get("permissions", {})
    if perms.get("payment") not in ["read", "crud"]:
        raise HTTPException(status_code=403, detail="Forbidden: Requires payment read access")
    return user


@router.get("/transactions")
def get_transactions(
    page: int = Query(1),
    perPage: int = Query(20),
    status: Optional[str] = Query(None),
    user: dict = Depends(require_payment_read)
):
    offset = (page - 1) * perPage
    sql = """
        SELECT pt.*, a.full_name as applicant_name, a.email as applicant_email 
        FROM ppdb_payment_transactions pt
        JOIN ppdb_applicants a ON pt.applicant_id = a.id
        WHERE 1=1
    """
    count_sql = """
        SELECT COUNT(*) as cnt
        FROM ppdb_payment_transactions pt
        JOIN ppdb_applicants a ON pt.applicant_id = a.id
        WHERE 1=1
    """
    params: dict = {}

    if status:
        sql += " AND pt.status = :status"
        count_sql += " AND pt.status = :status"
        params["status"] = status

    sql += " ORDER BY pt.created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()

    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"]}


@router.get("/my-transaction")
def get_my_transaction(user: dict = Depends(get_current_user)):
    applicant = get_by_column("ppdb_applicants", "user_id", user["id"])
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant record not found")
        
    transactions = execute_raw(
        "SELECT * FROM ppdb_payment_transactions WHERE applicant_id = :id ORDER BY created_at DESC LIMIT 1",
        {"id": applicant["id"]}
    )
    return {"applicant": applicant, "transaction": transactions[0] if transactions else None}


@router.put("/transactions/{id}/confirm")
def confirm_payment(id: str, user: dict = Depends(require_payment_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        tx_rows = conn.execute(
            text("SELECT * FROM ppdb_payment_transactions WHERE id = :id"),
            {"id": id}
        ).mappings().all()
        
        if not tx_rows:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        tx = tx_rows[0]
        if tx["status"] == "success":
            raise HTTPException(status_code=400, detail="Transaction already confirmed")
            
        with conn.begin():
            now_wib = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")
            # Update transaction status
            conn.execute(
                text("""
                    UPDATE ppdb_payment_transactions 
                    SET status = 'success', confirmed_by = :confirmed_by, confirmed_at = :confirmed_at, updated_at = :now 
                    WHERE id = :id
                """),
                {"id": id, "confirmed_by": user["id"], "confirmed_at": now_wib, "now": now_wib}
            )
            # Update applicant status
            conn.execute(
                text("""
                    UPDATE ppdb_applicants 
                    SET payment_status = 'paid', status = 'document_uploaded_pending', updated_at = :now 
                    WHERE id = :applicant_id
                """),
                {"applicant_id": tx["applicant_id"], "now": now_wib}
            )
            
            # Fetch user_id for notification
            applicant_rows = conn.execute(
                text("SELECT user_id FROM ppdb_applicants WHERE id = :id"),
                {"id": tx["applicant_id"]}
            ).mappings().all()
            
            if applicant_rows:
                user_id = applicant_rows[0]["user_id"]
                
    if 'user_id' in locals() and user_id:
        from src.core.notif_service import send_notification
        send_notification("payment_success", user_id, {"nominal_bayar": tx["amount"]})
    
    return {"success": True, "message": "Payment confirmed successfully"}
