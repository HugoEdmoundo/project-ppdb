from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from src.core.database import execute_raw, get_raw_pool, get_by_column
from src.core.dependencies import get_current_user
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

    # Scope ke gelombang aktif. Jika tidak ada gelombang aktif, kembalikan kosong.
    pool = get_raw_pool()
    with pool.connect() as conn:
        active_row = conn.execute(
            text("SELECT id FROM ppdb_waves WHERE status = 'active' LIMIT 1")
        ).mappings().all()

    if not active_row:
        return {"data": [], "total": 0, "active_wave": None}

    active_wave_id = active_row[0]["id"]

    sql = """
        SELECT pt.*, a.full_name as applicant_name, a.email as applicant_email 
        FROM ppdb_payment_transactions pt
        JOIN ppdb_applicants a ON pt.applicant_id = a.id
        WHERE a.wave_id = :wave_id
    """
    count_sql = """
        SELECT COUNT(*) as cnt
        FROM ppdb_payment_transactions pt
        JOIN ppdb_applicants a ON pt.applicant_id = a.id
        WHERE a.wave_id = :wave_id
    """
    params: dict = {"wave_id": active_wave_id}

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

    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"], "active_wave": active_wave_id}


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
    with pool.begin() as conn:
        tx_rows = conn.execute(
            text("SELECT * FROM ppdb_payment_transactions WHERE id = :id"),
            {"id": id}
        ).mappings().all()
        
        if not tx_rows:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        tx = tx_rows[0]
        if tx["status"] == "success":
            raise HTTPException(status_code=400, detail="Transaction already confirmed")
            
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
        try:
            from src.core.notif_service import send_notification
            send_notification("payment_success", user_id, {"nominal_bayar": tx["amount"]})
        except Exception:
            import logging
            logging.getLogger("ptdarrahman.payment").exception("Failed to send payment_success notification for tx %s", id)
    
    return {"success": True, "message": "Payment confirmed successfully"}

@router.put("/transactions/{id}/cancel-confirm")
def cancel_confirm_payment(id: str, user: dict = Depends(require_payment_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        tx_rows = conn.execute(
            text("SELECT * FROM ppdb_payment_transactions WHERE id = :id"),
            {"id": id}
        ).mappings().all()
        
        if not tx_rows:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        tx = tx_rows[0]
        if tx["status"] != "success":
            raise HTTPException(status_code=400, detail="Only successful transactions can be cancelled")
            
        if tx["method"] != "offline":
            raise HTTPException(status_code=400, detail="Cannot cancel confirmation for online payment gateway transactions")
            
        with conn.begin():
            now_wib = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")
            # Revert transaction status
            conn.execute(
                text("""
                    UPDATE ppdb_payment_transactions 
                    SET status = 'pending', confirmed_by = NULL, confirmed_at = NULL, updated_at = :now 
                    WHERE id = :id
                """),
                {"id": id, "now": now_wib}
            )
            # Revert applicant status
            conn.execute(
                text("""
                    UPDATE ppdb_applicants 
                    SET payment_status = 'pending', status = 'pending_payment', updated_at = :now 
                    WHERE id = :applicant_id
                """),
                {"applicant_id": tx["applicant_id"], "now": now_wib}
            )
            
    return {"success": True, "message": "Payment confirmation cancelled successfully"}


@router.post("/webhook")
async def payment_webhook(request: Request):
    """
    Webhook for Payment Gateway (e.g., Midtrans)
    """
    payload = await request.json()
    order_id = payload.get("order_id")
    transaction_status = payload.get("transaction_status")
    fraud_status = payload.get("fraud_status")
    
    pool = get_raw_pool()
    with pool.connect() as conn:
        tx_rows = conn.execute(
            text("SELECT * FROM ppdb_payment_transactions WHERE id = :id"),
            {"id": order_id}
        ).mappings().all()
        
        if not tx_rows:
            return {"status": "ignored", "message": "Transaction not found"}
            
        tx = tx_rows[0]
        if tx["status"] == "success":
            return {"status": "ignored", "message": "Already success"}
            
        new_status = tx["status"]
        if transaction_status == "capture":
            if fraud_status == "challenge":
                new_status = "pending"
            elif fraud_status == "accept":
                new_status = "success"
        elif transaction_status == "settlement":
            new_status = "success"
        elif transaction_status in ["cancel", "deny", "expire"]:
            new_status = "expired" if transaction_status == "expire" else "failed"
        elif transaction_status == "pending":
            new_status = "pending"
            
        if new_status == tx["status"]:
            return {"status": "ignored"}
            
        now_wib = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")
        with conn.begin():
            conn.execute(
                text("UPDATE ppdb_payment_transactions SET status = :status, updated_at = :now WHERE id = :id"),
                {"status": new_status, "now": now_wib, "id": order_id}
            )
            
            if new_status == "success":
                conn.execute(
                    text("UPDATE ppdb_applicants SET payment_status = 'paid', status = 'document_uploaded_pending', updated_at = :now WHERE id = :applicant_id"),
                    {"applicant_id": tx["applicant_id"], "now": now_wib}
                )
            elif new_status in ["failed", "expired"]:
                conn.execute(
                    text("UPDATE ppdb_applicants SET payment_status = :status, updated_at = :now WHERE id = :applicant_id"),
                    {"status": new_status, "now": now_wib, "applicant_id": tx["applicant_id"]}
                )
                
        applicant_rows = conn.execute(
            text("SELECT user_id FROM ppdb_applicants WHERE id = :id"),
            {"id": tx["applicant_id"]}
        ).mappings().all()
        
        if applicant_rows:
            user_id = applicant_rows[0]["user_id"]
            from src.core.notif_service import send_notification
            
            if new_status == "success":
                send_notification("payment_success", user_id, {"nominal_bayar": tx["amount"]})
            elif new_status == "failed":
                send_notification("payment_failed", user_id, {"alasan_kegagalan": "Pembayaran ditolak atau dibatalkan dari sistem."})
            elif new_status == "expired":
                send_notification("payment_expired", user_id, {})
                
    return {"status": "ok"}


import math
from fastapi import UploadFile, File, Form
from src.core.uploads import upload_file

# ─── Stage 2 — Diskonasi (per peserta lulus) ─────────────────────────────────

@router.get("/stage2/applicants")
def get_stage2_applicants(user: dict = Depends(require_payment_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        active_row = conn.execute(
            text("SELECT id FROM ppdb_waves WHERE status = 'active' LIMIT 1")
        ).mappings().all()
        
        if not active_row:
            return {"data": [], "total": 0, "active_wave": None}
            
        active_wave_id = active_row[0]["id"]
        
        sql = """
            SELECT a.id, a.full_name, a.nisn, a.email, a.phone,
                   a.registration_level, a.registration_path
            FROM ppdb_applicants a
            JOIN selection_results sr ON sr.applicant_id = a.id
            WHERE sr.graduation_status = 'passed' 
              AND a.wave_id = :active_wave_id 
              AND a.deleted_at IS NULL
        """
        applicants = conn.execute(text(sql), {"active_wave_id": active_wave_id}).mappings().all()
        
        results = []
        for app in applicants:
            app_dict = dict(app)
            
            # Check discounts
            has_discount = conn.execute(
                text("SELECT id FROM ppdb_applicant_discounts WHERE applicant_id = :aid LIMIT 1"),
                {"aid": app["id"]}
            ).first() is not None
            app_dict["discount_configured"] = has_discount
            
            # Check bills
            bills = conn.execute(
                text("SELECT id, status FROM ppdb_stage2_bills WHERE applicant_id = :aid"),
                {"aid": app["id"]}
            ).mappings().all()
            
            app_dict["bills_generated"] = len(bills) > 0
            app_dict["total_bills"] = len(bills)
            app_dict["total_paid_bills"] = sum(1 for b in bills if b["status"] == "paid")

            # MOU status
            mou_row = conn.execute(
                text("SELECT status FROM ppdb_mou WHERE applicant_id = :aid LIMIT 1"),
                {"aid": app["id"]}
            ).first()
            app_dict["mou_status"] = mou_row[0] if mou_row else None
            
            results.append(app_dict)
            
    return {"data": results, "total": len(results), "active_wave": active_wave_id}

@router.get("/stage2/{applicant_id}/discounts")
def get_applicant_discounts(applicant_id: str, user: dict = Depends(require_payment_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id, full_name, wave_id FROM ppdb_applicants WHERE id = :aid"),
            {"aid": applicant_id}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        fee_items = conn.execute(
            text("""
                SELECT fi.*, d.discount_type, d.discount_value, d.installment_count
                FROM ppdb_wave_fee_items fi
                LEFT JOIN ppdb_applicant_discounts d ON d.fee_item_id = fi.id AND d.applicant_id = :aid
                WHERE fi.wave_id = :wave_id
                ORDER BY fi.order_index ASC
            """),
            {"aid": applicant_id, "wave_id": applicant["wave_id"]}
        ).mappings().all()
        
        items_result = []
        for item in fee_items:
            i_dict = dict(item)
            if i_dict.get("discount_type") is not None:
                discount = {
                    "discount_type": i_dict.pop("discount_type"),
                    "discount_value": i_dict.pop("discount_value"),
                    "installment_count": i_dict.pop("installment_count"),
                }
                i_dict["discount"] = discount
            else:
                i_dict.pop("discount_type", None)
                i_dict.pop("discount_value", None)
                i_dict.pop("installment_count", None)
                i_dict["discount"] = None
            items_result.append(i_dict)
            
        mou = conn.execute(
            text("SELECT status, signed_at FROM ppdb_mou WHERE applicant_id = :aid"),
            {"aid": applicant_id}
        ).mappings().first()
        
    return {
        "applicant": dict(applicant),
        "fee_items": items_result,
        "mou": dict(mou) if mou else None
    }

@router.post("/stage2/{applicant_id}/discounts")
async def save_applicant_discounts(request: Request, applicant_id: str, user: dict = Depends(require_payment_admin)):
    body = await request.json()
    items = body.get("items", [])
    
    pool = get_raw_pool()
    import uuid
    
    saved = 0
    generated = 0
    
    with pool.begin() as conn:
        for item in items:
            fee_item_id = item.get("fee_item_id")
            dtype = item.get("discount_type")
            dvalue = item.get("discount_value")
            icount = int(item.get("installment_count") or 0)
            
            fi = conn.execute(
                text("SELECT nominal FROM ppdb_wave_fee_items WHERE id = :id"),
                {"id": fee_item_id}
            ).mappings().first()
            if not fi:
                continue
                
            nominal = fi["nominal"]
            discount_amount = 0
            if dtype == "percent" and dvalue:
                discount_amount = math.floor(nominal * float(dvalue) / 100)
            elif dtype == "nominal" and dvalue:
                discount_amount = min(int(dvalue), nominal)
                
            final_amount = nominal - discount_amount
            
            # Upsert discount
            existing_d = conn.execute(
                text("SELECT id FROM ppdb_applicant_discounts WHERE applicant_id = :aid AND fee_item_id = :fid"),
                {"aid": applicant_id, "fid": fee_item_id}
            ).first()
            
            if existing_d:
                conn.execute(
                    text("""
                        UPDATE ppdb_applicant_discounts
                        SET discount_type = :dt, discount_value = :dv, installment_count = :ic
                        WHERE applicant_id = :aid AND fee_item_id = :fid
                    """),
                    {"dt": dtype, "dv": dvalue, "ic": icount, "aid": applicant_id, "fid": fee_item_id}
                )
            else:
                conn.execute(
                    text("""
                        INSERT INTO ppdb_applicant_discounts (id, applicant_id, fee_item_id, discount_type, discount_value, installment_count)
                        VALUES (:id, :aid, :fid, :dt, :dv, :ic)
                    """),
                    {"id": str(uuid.uuid4()), "aid": applicant_id, "fid": fee_item_id, "dt": dtype, "dv": dvalue, "ic": icount}
                )
            saved += 1
            
            # Generate bills
            conn.execute(
                text("DELETE FROM ppdb_stage2_bills WHERE applicant_id = :aid AND fee_item_id = :fid"),
                {"aid": applicant_id, "fid": fee_item_id}
            )
            
            now_wib = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
            if icount == 0:
                conn.execute(
                    text("""
                        INSERT INTO ppdb_stage2_bills (id, applicant_id, fee_item_id, installment_number, amount, status, created_at, updated_at)
                        VALUES (:id, :aid, :fid, 0, :amt, 'pending', :now, :now)
                    """),
                    {"id": str(uuid.uuid4()), "aid": applicant_id, "fid": fee_item_id, "amt": final_amount, "now": now_wib}
                )
                generated += 1
            elif icount > 0:
                amt_per_inst = math.ceil(final_amount / icount)
                for i in range(1, icount + 1):
                    # For the last installment, adjust the amount so it totals exactly to final_amount
                    if i == icount:
                        amt = final_amount - (amt_per_inst * (icount - 1))
                    else:
                        amt = amt_per_inst
                        
                    conn.execute(
                        text("""
                            INSERT INTO ppdb_stage2_bills (id, applicant_id, fee_item_id, installment_number, amount, status, created_at, updated_at)
                            VALUES (:id, :aid, :fid, :num, :amt, 'pending', :now, :now)
                        """),
                        {"id": str(uuid.uuid4()), "aid": applicant_id, "fid": fee_item_id, "num": i, "amt": amt, "now": now_wib}
                    )
                    generated += 1

    # Auto-generate MOU jika wave punya mou_template
    _auto_generate_mou(pool, applicant_id)

    return {"success": True, "discounts_saved": saved, "bills_generated": generated}

def _auto_generate_mou(pool, applicant_id: str):
    """Auto-generate/update MOU untuk peserta jika wave punya mou_template."""
    import uuid as _uuid
    try:
        with pool.connect() as conn:
            app_row = conn.execute(
                text("""
                    SELECT a.full_name, a.nisn, a.nik, a.previous_school, a.address,
                           a.parent_name, a.email, a.phone, a.registration_path,
                           a.registration_level, w.mou_template
                    FROM ppdb_applicants a
                    JOIN ppdb_waves w ON w.id = a.wave_id
                    WHERE a.id = :aid
                """),
                {"aid": applicant_id}
            ).mappings().first()

            if not app_row or not app_row.get("mou_template"):
                return  # Tidak ada template, skip

            template = str(app_row["mou_template"])
            now_wib = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")
            replacements = {
                "{nama_peserta}": app_row.get("full_name") or "",
                "{nisn}": app_row.get("nisn") or "",
                "{nik}": app_row.get("nik") or "",
                "{asal_sekolah}": app_row.get("previous_school") or "",
                "{alamat}": app_row.get("address") or "",
                "{nama_ortu}": app_row.get("parent_name") or "",
                "{email}": app_row.get("email") or "",
                "{nomor_wa}": app_row.get("phone") or "",
                "{jalur}": app_row.get("registration_path") or "",
                "{jenjang}": app_row.get("registration_level") or "",
                "{tanggal}": datetime.now(WIB).strftime("%d %B %Y"),
            }
            for k, v in replacements.items():
                template = template.replace(k, v)

            existing_mou = conn.execute(
                text("SELECT id FROM ppdb_mou WHERE applicant_id = :aid"),
                {"aid": applicant_id}
            ).mappings().first()

        with pool.begin() as conn2:
            if existing_mou:
                conn2.execute(
                    text("UPDATE ppdb_mou SET draft_content = :content, updated_at = :now WHERE applicant_id = :aid"),
                    {"content": template, "now": now_wib, "aid": applicant_id}
                )
            else:
                conn2.execute(
                    text("INSERT INTO ppdb_mou (id, applicant_id, draft_content, status, created_at, updated_at) VALUES (:id, :aid, :content, 'draft', :now, :now)"),
                    {"id": str(_uuid.uuid4()), "aid": applicant_id, "content": template, "now": now_wib}
                )
    except Exception as exc:
        import logging
        logging.getLogger("ptdarrahman.payment").warning("MOU auto-generate failed for %s: %s", applicant_id, exc)

# ─── Stage 2 — Tagihan ────────────────────────────────────────────────────────

@router.get("/stage2/bills")
def get_stage2_bills(
    applicant_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_payment_read)
):
    offset = (page - 1) * perPage
    pool = get_raw_pool()
    
    with pool.connect() as conn:
        active_row = conn.execute(
            text("SELECT id FROM ppdb_waves WHERE status = 'active' LIMIT 1")
        ).mappings().all()
        
        if not active_row:
            return {"data": [], "total": 0, "active_wave": None}
            
        active_wave_id = active_row[0]["id"]
        
        sql = """
            SELECT b.*, a.full_name, fi.name as fee_item_name
            FROM ppdb_stage2_bills b
            JOIN ppdb_applicants a ON b.applicant_id = a.id
            JOIN ppdb_wave_fee_items fi ON b.fee_item_id = fi.id
            WHERE a.wave_id = :wave_id
        """
        count_sql = """
            SELECT COUNT(*) as cnt
            FROM ppdb_stage2_bills b
            JOIN ppdb_applicants a ON b.applicant_id = a.id
            JOIN ppdb_wave_fee_items fi ON b.fee_item_id = fi.id
            WHERE a.wave_id = :wave_id
        """
        params = {"wave_id": active_wave_id}
        
        if applicant_id:
            sql += " AND b.applicant_id = :aid"
            count_sql += " AND b.applicant_id = :aid"
            params["aid"] = applicant_id
            
        if status:
            sql += " AND b.status = :status"
            count_sql += " AND b.status = :status"
            params["status"] = status
            
        sql += " ORDER BY b.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = perPage
        params["offset"] = offset
        
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()
        
    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"], "active_wave": active_wave_id}

@router.get("/stage2/my-bills")
def get_my_stage2_bills(user: dict = Depends(get_current_user)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :user_id"),
            {"user_id": user["id"]}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        bills = conn.execute(
            text("""
                SELECT b.*, fi.name as fee_item_name, fi.order_index
                FROM ppdb_stage2_bills b
                JOIN ppdb_wave_fee_items fi ON b.fee_item_id = fi.id
                WHERE b.applicant_id = :aid
                ORDER BY fi.order_index ASC, b.installment_number ASC
            """),
            {"aid": applicant["id"]}
        ).mappings().all()
        
        mou = conn.execute(
            text("SELECT status FROM ppdb_mou WHERE applicant_id = :aid"),
            {"aid": applicant["id"]}
        ).mappings().first()
        
    mou_signed = mou["status"] == "signed" if mou else False
    
    return {"bills": [dict(b) for b in bills], "mou_signed": mou_signed}

@router.put("/stage2/bills/{bill_id}/confirm")
def confirm_stage2_bill(bill_id: str, user: dict = Depends(require_payment_admin)):
    pool = get_raw_pool()
    now_wib = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
    with pool.begin() as conn:
        bill = conn.execute(
            text("SELECT status FROM ppdb_stage2_bills WHERE id = :id"),
            {"id": bill_id}
        ).mappings().first()
        
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill["status"] != "pending":
            raise HTTPException(status_code=400, detail="Hanya dapat mengonfirmasi tagihan berstatus pending")
            
        conn.execute(
            text("""
                UPDATE ppdb_stage2_bills 
                SET status = 'paid', confirmed_by = :uid, confirmed_at = :now, updated_at = :now
                WHERE id = :id
            """),
            {"uid": user["id"], "now": now_wib, "id": bill_id}
        )
    return {"success": True}

@router.put("/stage2/bills/{bill_id}/cancel")
def cancel_stage2_bill(bill_id: str, user: dict = Depends(require_payment_admin)):
    pool = get_raw_pool()
    now_wib = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
    with pool.begin() as conn:
        bill = conn.execute(
            text("SELECT status FROM ppdb_stage2_bills WHERE id = :id"),
            {"id": bill_id}
        ).mappings().first()
        
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill["status"] != "paid":
            raise HTTPException(status_code=400, detail="Hanya dapat membatalkan tagihan berstatus paid")
            
        conn.execute(
            text("""
                UPDATE ppdb_stage2_bills 
                SET status = 'pending', confirmed_by = NULL, confirmed_at = NULL, proof_url = NULL, updated_at = :now
                WHERE id = :id
            """),
            {"now": now_wib, "id": bill_id}
        )
    return {"success": True}

@router.post("/stage2/bills/{bill_id}/upload-proof")
async def upload_stage2_proof(
    bill_id: str, 
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :uid"),
            {"uid": user["id"]}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        bill = conn.execute(
            text("SELECT id, status, applicant_id FROM ppdb_stage2_bills WHERE id = :id"),
            {"id": bill_id}
        ).mappings().first()
        
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill["applicant_id"] != applicant["id"]:
            raise HTTPException(status_code=403, detail="Not your bill")
        if bill["status"] != "pending":
            raise HTTPException(status_code=400, detail="Hanya dapat upload bukti untuk tagihan pending")
            
    result = await upload_file(file)
    
    with pool.begin() as conn:
        conn.execute(
            text("UPDATE ppdb_stage2_bills SET proof_url = :url WHERE id = :id"),
            {"url": result.public_url, "id": bill_id}
        )
        
    return {"success": True, "proof_url": result.public_url}

