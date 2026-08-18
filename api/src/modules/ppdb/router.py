import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from src.core.database import (
    audit_log,
    create_record,
    delete_record,
    execute_raw,
    get_by_id,
    get_raw_pool,
    update_record,
)
from src.core.notif_service import send_notifications
from src.core.dependencies import require_ppdb_admin, require_ppdb_read, get_current_user
from src.core.uploads import upload_file, delete_upload
from src.core.security import hash_password
from src.modules.ppdb.schemas import (
    ApplicantPasswordReset,
    ApplicantRegister,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveUpdate,
)

logger = logging.getLogger("ptdarrahman.ppdb")

router = APIRouter()


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------

@router.get("/periods")
def get_periods(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    user: dict = Depends(require_ppdb_read),
):
    offset = (page - 1) * perPage

    sql = "SELECT p.*, (SELECT COUNT(*) FROM ppdb_waves w WHERE w.period_id = p.id) as wave_count FROM ppdb_periods p"
    count_sql = "SELECT COUNT(*) as cnt FROM ppdb_periods p"
    params: dict = {}

    if search:
        sql += " WHERE p.name LIKE :search"
        count_sql += " WHERE p.name LIKE :search"
        params["search"] = f"%{search}%"

    sql += " ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()

    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"]}


@router.get("/periods/all")
def get_all_periods(user: dict = Depends(require_ppdb_read)):
    sql = "SELECT id, name, status, academic_year FROM ppdb_periods ORDER BY created_at DESC"
    return execute_raw(sql)


@router.get("/periods/{id}")
def get_period_by_id(id: str, user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text("SELECT * FROM ppdb_periods WHERE id = :id LIMIT 1"), {"id": id}).mappings().all()
        if not rows:
            raise HTTPException(status_code=404, detail="Not found")
        period = dict(rows[0])
        waves = conn.execute(
            text("SELECT * FROM ppdb_waves WHERE period_id = :id ORDER BY wave_number ASC"), {"id": id}
        ).mappings().all()
        period["waves"] = [dict(w) for w in waves]
    return period


@router.post("/periods", status_code=201)
def create_period(body: PeriodCreate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "id": f"period-{uuid.uuid4()}",
        "name": body.name,
        "academic_year": body.academic_year,
        "description": body.description,
        "status": "inactive",
    }
    return create_record("ppdb_periods", data)


@router.put("/periods/{id}")
def update_period(id: str, body: PeriodUpdate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "name": body.name,
        "academic_year": body.academic_year,
        "description": body.description,
    }
    updated = update_record("ppdb_periods", id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated


@router.put("/periods/{id}/activate")
def activate_period(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.begin() as conn:
        conn.execute(text('UPDATE ppdb_periods SET status = "inactive"'))
        conn.execute(text('UPDATE ppdb_waves SET status = "inactive"'))
        conn.execute(text('UPDATE ppdb_periods SET status = "active" WHERE id = :id'), {"id": id})

    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return {"success": True}


@router.put("/periods/{id}/deactivate")
def deactivate_period(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.begin() as conn:
        conn.execute(text('UPDATE ppdb_periods SET status = "inactive" WHERE id = :id'), {"id": id})
        conn.execute(text('UPDATE ppdb_waves SET status = "inactive" WHERE period_id = :id'), {"id": id})

    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return {"success": True}


@router.delete("/periods/{id}")
def delete_period_endpoint(id: str, user: dict = Depends(require_ppdb_admin)):
    delete_record("ppdb_periods", id)
    return {"success": True}


# ---------------------------------------------------------------------------
# Waves
# ---------------------------------------------------------------------------

@router.get("/waves")
def get_waves(period_id: Optional[str] = Query(None), user: dict = Depends(require_ppdb_read)):
    sql = "SELECT * FROM ppdb_waves"
    params: dict = {}
    if period_id:
        sql += " WHERE period_id = :period_id"
        params["period_id"] = period_id
    sql += " ORDER BY registration_start_date ASC, wave_number ASC"
    return execute_raw(sql, params)


@router.get("/waves/all")
def get_all_waves(user: dict = Depends(require_ppdb_read)):
    return execute_raw("SELECT * FROM ppdb_waves ORDER BY registration_start_date ASC, wave_number ASC")


@router.get("/waves/{id}")
def get_wave_by_id(id: str, user: dict = Depends(require_ppdb_read)):
    wave = execute_raw("SELECT * FROM ppdb_waves WHERE id = :id LIMIT 1", {"id": id})
    if not wave:
        raise HTTPException(status_code=404, detail="Not found")
    return wave[0]


@router.post("/waves", status_code=201)
def create_wave(body: WaveCreate, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        period_rows = conn.execute(
            text("SELECT id FROM ppdb_periods WHERE id = :id"), {"id": body.period_id}
        ).mappings().all()
        if not period_rows:
            raise HTTPException(status_code=404, detail="Period not found")

        max_rows = conn.execute(
            text("SELECT MAX(wave_number) as max_num FROM ppdb_waves WHERE period_id = :id"),
            {"id": body.period_id},
        ).mappings().all()
        max_num = max_rows[0]["max_num"] if max_rows and max_rows[0]["max_num"] is not None else 0
        wave_number = max_num + 1

    data = {
        "id": f"wave-{uuid.uuid4()}",
        "period_id": body.period_id,
        "wave_number": wave_number,
        "name": body.name,
        "registration_start_date": body.registration_start_date,
        "registration_end_date": body.registration_end_date,
        "document_upload_end_date": body.document_upload_end_date,
        "selection_date": body.selection_date,
        "quota": body.quota,
        "registration_fee": body.registration_fee,
        "second_stage_fee": body.second_stage_fee,
        "status": "inactive",
    }
    return create_record("ppdb_waves", data)


@router.put("/waves/{id}")
def update_wave(id: str, body: WaveUpdate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "name": body.name,
        "registration_start_date": body.registration_start_date,
        "registration_end_date": body.registration_end_date,
        "document_upload_end_date": body.document_upload_end_date,
        "selection_date": body.selection_date,
        "quota": body.quota,
        "registration_fee": body.registration_fee,
        "second_stage_fee": body.second_stage_fee,
    }
    updated = update_record("ppdb_waves", id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated


@router.put("/waves/{id}/activate")
def activate_wave(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        wave_rows = conn.execute(text("SELECT period_id FROM ppdb_waves WHERE id = :id"), {"id": id}).mappings().all()
        if not wave_rows:
            raise HTTPException(status_code=404, detail="Wave not found")
        period_id = wave_rows[0]["period_id"]

        period_rows = conn.execute(
            text("SELECT status FROM ppdb_periods WHERE id = :id"), {"id": period_id}
        ).mappings().all()
        if not period_rows or period_rows[0]["status"] != "active":
            raise HTTPException(status_code=400, detail="Periode belum aktif")

    with pool.begin() as conn:
        conn.execute(text('UPDATE ppdb_waves SET status = "inactive"'))
        conn.execute(text('UPDATE ppdb_waves SET status = "active" WHERE id = :id'), {"id": id})

    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return {"success": True}


@router.put("/waves/{id}/deactivate")
def deactivate_wave(id: str, user: dict = Depends(require_ppdb_admin)):
    execute_raw('UPDATE ppdb_waves SET status = "inactive" WHERE id = :id', {"id": id})
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return {"success": True}


@router.delete("/waves/{id}")
def delete_wave_endpoint(id: str, user: dict = Depends(require_ppdb_admin)):
    delete_record("ppdb_waves", id)
    return {"success": True}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def generate_random_password(length: int = 8) -> str:
    return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(length))


def generate_unique_username(full_name: str) -> str:
    """Generate a username that does not collide with an existing `users` row.

    `users.username` is UNIQUE; the naive 4-digit suffix collides easily once
    several applicants share the same first name, which raised a duplicate-key
    500 during registration.
    """
    base = "".join(c for c in full_name.split(" ")[0].lower() if c.isalnum()) or "user"
    for _ in range(10):
        candidate = f"{base}{''.join(random.choice(string.digits) for _ in range(4))}"
        rows = execute_raw("SELECT id FROM users WHERE username = :u LIMIT 1", {"u": candidate})
        if not rows:
            return candidate
    return f"{base}{uuid.uuid4().hex[:8]}"


@router.post("/register", status_code=201)
def register_applicant(body: ApplicantRegister):
    pool = get_raw_pool()
    with pool.connect() as conn:
        wave_rows = conn.execute(
            text('SELECT id, registration_fee FROM ppdb_waves WHERE status = "active" LIMIT 1')
        ).mappings().all()
        if not wave_rows:
            raise HTTPException(status_code=400, detail="Pendaftaran saat ini sedang ditutup atau belum dibuka.")
        active_wave_id = wave_rows[0]["id"]
        registration_fee = wave_rows[0]["registration_fee"] or 0

        existing = conn.execute(
            text('SELECT id FROM ppdb_applicants WHERE email = :email AND status != "expired" LIMIT 1'),
            {"email": body.email},
        ).mappings().all()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar. Silakan login atau gunakan email lain.")

        # `users.email` is UNIQUE but never deleted (cron only soft-deletes the
        # applicant), so also block emails that belong to an expired/old account.
        existing_user = conn.execute(
            text("SELECT id FROM users WHERE email = :email LIMIT 1"),
            {"email": body.email},
        ).mappings().all()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email sudah pernah terdaftar sebelumnya. Hubungi panitia jika ingin mendaftar ulang.",
            )

    raw_password = generate_random_password()
    username = generate_unique_username(body.full_name)

    calon_role = execute_raw("SELECT id FROM roles WHERE name = 'Calon Murid' LIMIT 1")
    calon_role_id = calon_role[0]["id"] if calon_role else None

    try:
        created_user = create_record(
            "users",
            {
                "id": str(uuid.uuid4()),
                "username": username,
                "password_hash": hash_password(raw_password),
                "email": body.email,
                "full_name": body.full_name,
                "user_type": "applicant",
                "role_id": calon_role_id,
            },
            return_row=False,
        )

        created_applicant = create_record(
            "ppdb_applicants",
            {
                "id": f"applicant-{uuid.uuid4()}",
                "wave_id": active_wave_id,
                "user_id": created_user["id"],
                "full_name": body.full_name,
                "email": body.email,
                "phone": body.phone,
                "registration_path": body.registration_path,
                "registration_level": body.registration_level,
                "address": body.address,
                "province": body.province,
                "city": body.city,
                "district": body.district,
                "village": body.village,
                "postal_code": body.postal_code,
                "gender": body.gender,
                "birth_place": body.birth_place,
                "birth_date": body.birth_date,
                "nisn": body.nisn,
                "nik": body.nik,
                "parent_name": body.parent_name,
                "previous_school": body.previous_school,
                "major_choice": body.major_choice,
                "status": "pending_payment",
                "payment_status": "pending",
                "payment_deadline": (datetime.now(ZoneInfo("Asia/Jakarta")) + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
            },
            return_row=False,
        )

        # Buat transaksi pembayaran offline dengan status pending
        create_record(
            "ppdb_payment_transactions",
            {
                "id": f"pay-{uuid.uuid4()}",
                "applicant_id": created_applicant["id"],
                "method": "offline",
                "amount": registration_fee,
                "status": "pending",
            },
            return_row=False,
        )
    except IntegrityError:
        # Race condition / collision (e.g. email yang baru saja terdaftar).
        logger.exception("Duplicate on register: email=%s username=%s", body.email, username)
        raise HTTPException(
            status_code=400,
            detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
        )

    # Kirim notifikasi welcome + pengingat pembayaran (best-effort; jangan gagalkan
    # pendaftaran hanya karena logging notifikasi bermasalah).
    try:
        send_notifications(
            [
                ("welcome", {
                    "password": raw_password,
                    "link_login": "https://ppdb.ptdarrahman.sch.id/auth/login", # TBD
                    "batas_waktu_bayar": created_applicant["payment_deadline"],
                }),
                ("payment_reminder", {
                    "link_pembayaran": "https://ppdb.ptdarrahman.sch.id/checkout", # TBD
                    "batas_waktu_bayar": created_applicant["payment_deadline"],
                }),
            ],
            created_user["id"],
            user_row=created_user,
            applicant_row=created_applicant,
        )
    except Exception:
        logger.exception("send_notifications failed after registration; continuing")

    return {
        "success": True,
        "message": "Pendaftaran berhasil",
        "applicant_id": created_applicant["id"],
        "credentials": {"username": username, "password": raw_password},
    }


# ---------------------------------------------------------------------------
# Applicants & dashboard
# ---------------------------------------------------------------------------

@router.get("/applicants")
def get_applicants(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    wave_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: dict = Depends(require_ppdb_read),
):
    offset = (page - 1) * perPage

    sql = "SELECT a.*, w.name as wave_name, u.username FROM ppdb_applicants a LEFT JOIN ppdb_waves w ON a.wave_id = w.id LEFT JOIN users u ON a.user_id = u.id WHERE 1=1"
    count_sql = "SELECT COUNT(*) as cnt FROM ppdb_applicants a WHERE 1=1"
    params: dict = {}

    if search:
        sql += " AND (a.full_name LIKE :search OR a.email LIKE :search OR a.province LIKE :search OR a.city LIKE :search OR a.district LIKE :search OR a.village LIKE :search)"
        count_sql += " AND (a.full_name LIKE :search OR a.email LIKE :search OR a.province LIKE :search OR a.city LIKE :search OR a.district LIKE :search OR a.village LIKE :search)"
        params["search"] = f"%{search}%"

    if wave_id:
        sql += " AND a.wave_id = :wave_id"
        count_sql += " AND a.wave_id = :wave_id"
        params["wave_id"] = wave_id

    if status:
        sql += " AND a.status = :status"
        count_sql += " AND a.status = :status"
        params["status"] = status

    sql += " ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset"
    params["limit"] = perPage
    params["offset"] = offset

    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()

    return {"data": [dict(r) for r in rows], "total": count_rows[0]["cnt"]}


@router.put("/applicants/{id}/password")
def reset_applicant_password(
    id: str,
    body: ApplicantPasswordReset,
    user: dict = Depends(require_ppdb_admin),
):
    """Reset password akun pendaftar. Password wajib dibuat sistem (bukan isian manual
    dari admin) — kalau body.password kosong maka tidak ada yang berubah (no-op)."""
    applicant = get_by_id("ppdb_applicants", id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")

    user_id = applicant.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Akun login pendaftar tidak ditemukan")

    new_password = (body.password or "").strip()
    if not new_password:
        return {"changed": False, "message": "Password tidak diubah (field kosong)"}

    user_row = get_by_id("users", user_id)
    if not user_row:
        raise HTTPException(status_code=400, detail="Akun login pendaftar tidak ditemukan")

    update_record(
        "users",
        user_id,
        {
            "password_hash": hash_password(new_password),
            "failed_login_attempts": 0,
            "locked_until": None,
        },
    )

    # Kirim notif password baru (simulasi: tercatat di notification_logs).
    try:
        send_notifications(
            [("password_reset", {
                "password": new_password,
                "link_login": "https://ppdb.ptdarrahman.sch.id/auth/login",  # TBD
            })],
            user_id,
            user_row=user_row,
            applicant_row=applicant,
        )
    except Exception:
        logger.exception("send password_reset notification failed; continuing")

    return {
        "changed": True,
        "message": "Password berhasil direset",
        "username": user_row.get("username", ""),
        "password": new_password,
    }


@router.get("/dashboard/stats")
def get_ppdb_dashboard(user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        periods_count = conn.execute(text("SELECT COUNT(*) as cnt FROM ppdb_periods")).scalar() or 0
        waves_count = conn.execute(text("SELECT COUNT(*) as cnt FROM ppdb_waves")).scalar() or 0
        active_period = conn.execute(
            text('SELECT name FROM ppdb_periods WHERE status = "active" LIMIT 1')
        ).scalar()

    return {
        "total_periods": periods_count,
        "total_waves": waves_count,
        "active_period_name": active_period,
    }


@router.post("/cron/soft-delete-expired")
def soft_delete_expired_applicants():
    """
    Cron job run daily to soft delete applicants who haven't paid past their deadline.
    """
    pool = get_raw_pool()
    now_wib = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
    
    with pool.begin() as conn:
        # Find all expired applicants
        rows = conn.execute(
            text("""
                SELECT id, user_id FROM ppdb_applicants 
                WHERE payment_status = 'pending' 
                AND payment_deadline <= :now 
                AND deleted_at IS NULL
            """),
            {"now": now_wib}
        ).mappings().all()
        
        if not rows:
            return {"deleted": 0}
            
        applicant_ids = [r["id"] for r in rows]
        user_ids = [r["user_id"] for r in rows]
        
        # Soft delete applicants
        conn.execute(
            text("""
                UPDATE ppdb_applicants 
                SET deleted_at = :now, payment_status = 'expired', status = 'expired' 
                WHERE id IN :ids
            """),
            {"now": now_wib, "ids": tuple(applicant_ids)}
        )
        
        # Disable users so they cannot login
        if user_ids:
            conn.execute(
                text("UPDATE users SET is_active = 0 WHERE id IN :user_ids"),
                {"user_ids": tuple(user_ids)}
            )
            
        # Update pending transactions to expired
        conn.execute(
            text("""
                UPDATE ppdb_payment_transactions 
                SET status = 'expired', updated_at = :now 
                WHERE applicant_id IN :ids AND status = 'pending'
            """),
            {"now": now_wib, "ids": tuple(applicant_ids)}
        )
        
    for user_id in user_ids:
        send_notifications([("payment_expired", {})], user_id)
        
    return {"deleted": len(applicant_ids), "applicant_ids": applicant_ids}


@router.post("/cron/reminders")
def run_reminders():
    """
    Cron job run daily to send reminders.
    """
    pool = get_raw_pool()
    now_wib = datetime.now(ZoneInfo("Asia/Jakarta"))
    now_wib_str = now_wib.strftime("%Y-%m-%d %H:%M:%S")
    
    with pool.connect() as conn:
        tomorrow_wib = now_wib + timedelta(days=1)
        tomorrow_wib_str = tomorrow_wib.strftime("%Y-%m-%d %H:%M:%S")
        
        rows_payment = conn.execute(
            text("""
                SELECT id, user_id FROM ppdb_applicants 
                WHERE payment_status = 'pending' 
                AND payment_deadline > :now 
                AND payment_deadline <= :tomorrow 
                AND deleted_at IS NULL
            """),
            {"now": now_wib_str, "tomorrow": tomorrow_wib_str}
        ).mappings().all()
        
        from src.core.notif_service import send_notification
        
        payment_reminded = 0
        for r in rows_payment:
            send_notification("payment_reminder_d7", r["user_id"], {"batas_waktu_bayar": tomorrow_wib_str})
            payment_reminded += 1
            
        rows_docs = conn.execute(
            text("""
                SELECT a.id, a.user_id, DATEDIFF(w.document_upload_end_date, :now) as days_left
                FROM ppdb_applicants a 
                JOIN ppdb_waves w ON a.wave_id = w.id 
                WHERE a.status IN ('document_uploaded_pending', 'document_rejected') 
                AND w.document_upload_end_date IS NOT NULL
                AND a.deleted_at IS NULL
            """),
            {"now": now_wib_str}
        ).mappings().all()
        
        doc_reminded_h3 = 0
        doc_reminded_h1 = 0
        for r in rows_docs:
            days_left = r["days_left"]
            if days_left == 3:
                send_notification("document_reminder_d3", r["user_id"], {})
                doc_reminded_h3 += 1
            elif days_left == 1:
                send_notification("document_reminder_d1", r["user_id"], {})
                doc_reminded_h1 += 1
                
    return {
        "success": True,
        "payment_reminded": payment_reminded,
        "doc_reminded_h3": doc_reminded_h3,
        "doc_reminded_h1": doc_reminded_h1
    }


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("/documents")
def get_my_documents(user: dict = Depends(get_current_user)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :user_id LIMIT 1"),
            {"user_id": user["id"]}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        docs = conn.execute(
            text("SELECT * FROM file_uploads WHERE entity_id = :entity_id AND entity_type LIKE 'ppdb_document:%'"),
            {"entity_id": applicant["id"]}
        ).mappings().all()
        
    return {"data": [dict(d) for d in docs]}


@router.post("/documents/upload")
async def upload_document(
    request: Request,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :user_id LIMIT 1"),
            {"user_id": user["id"]}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        applicant_id = applicant["id"]
        entity_type = f"ppdb_document:{doc_type}"
        
        existing = conn.execute(
            text("SELECT id, storage_path FROM file_uploads WHERE entity_id = :entity_id AND entity_type = :entity_type LIMIT 1"),
            {"entity_id": applicant_id, "entity_type": entity_type}
        ).mappings().first()
        
    record_id = existing["id"] if existing else str(uuid.uuid4())
    upload_res = await upload_file(file, record_id)
    
    with pool.begin() as conn:
        if existing:
            try:
                delete_upload(existing["storage_path"])
            except Exception as e:
                logger.error(f"Failed to delete old upload: {e}")
                
            now = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(
                text("""
                    UPDATE file_uploads 
                    SET original_name = :oname, stored_name = :sname, mime_type = :mime, 
                        size_bytes = :size, storage_path = :spath, public_url = :url, data = :data, created_at = :now
                    WHERE id = :id
                """),
                {
                    "oname": upload_res.original_name,
                    "sname": upload_res.storage_path.split('/')[-1],
                    "mime": upload_res.mime_type,
                    "size": upload_res.size_bytes,
                    "spath": upload_res.storage_path,
                    "url": upload_res.public_url,
                    "data": upload_res.data,
                    "now": now,
                    "id": existing["id"]
                }
            )
            doc_id = existing["id"]
        else:
            now = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(
                text("""
                    INSERT INTO file_uploads 
                    (id, uploaded_by, original_name, stored_name, mime_type, size_bytes, storage_path, public_url, data, entity_type, entity_id, created_at)
                    VALUES 
                    (:id, :uid, :oname, :sname, :mime, :size, :spath, :url, :data, :etype, :eid, :now)
                """),
                {
                    "id": doc_id,
                    "uid": user["id"],
                    "oname": upload_res.original_name,
                    "sname": upload_res.storage_path.split('/')[-1],
                    "mime": upload_res.mime_type,
                    "size": upload_res.size_bytes,
                    "spath": upload_res.storage_path,
                    "url": upload_res.public_url,
                    "data": upload_res.data,
                    "etype": entity_type,
                    "eid": applicant_id,
                    "now": now
                }
            )
            
    url = upload_res.public_url
    if url.startswith("/"):
        url = f"{request.base_url}{url.lstrip('/')}"
    return {"success": True, "id": doc_id, "url": url, "doc_type": doc_type}


@router.post("/documents/submit")
def submit_documents(user: dict = Depends(get_current_user)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT id, status FROM ppdb_applicants WHERE user_id = :user_id LIMIT 1"),
            {"user_id": user["id"]}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        if applicant["status"] not in ("document_uploaded_pending", "document_rejected"):
            raise HTTPException(status_code=400, detail="Tidak dapat mengirim dokumen pada status ini")
            
    now = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
    update_record("ppdb_applicants", applicant["id"], {"status": "document_uploaded", "updated_at": now})
    
    return {"success": True, "message": "Dokumen berhasil dikirim untuk verifikasi"}


# ---------------------------------------------------------------------------
# Admin Verification
# ---------------------------------------------------------------------------

@router.get("/applicants/{id}/documents")
def get_applicant_documents(id: str, user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        docs = conn.execute(
            text("SELECT * FROM file_uploads WHERE entity_id = :id AND entity_type LIKE 'ppdb_document:%'"),
            {"id": id}
        ).mappings().all()
    return {"data": [dict(d) for d in docs]}

from pydantic import BaseModel

class DocumentVerify(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

@router.put("/applicants/{id}/documents/verify")
def verify_applicant_documents(id: str, body: DocumentVerify, user: dict = Depends(require_ppdb_admin)):
    if body.status not in ("document_approved", "document_rejected"):
        raise HTTPException(status_code=400, detail="Status tidak valid")
        
    pool = get_raw_pool()
    with pool.connect() as conn:
        applicant = conn.execute(
            text("SELECT user_id, status FROM ppdb_applicants WHERE id = :id LIMIT 1"),
            {"id": id}
        ).mappings().first()
        
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
            
        now = datetime.now(ZoneInfo("Asia/Jakarta")).strftime("%Y-%m-%d %H:%M:%S")
        with conn.begin():
            conn.execute(
                text("""
                    UPDATE ppdb_applicants 
                    SET status = :status, updated_at = :now, rejection_reason = :reason
                    WHERE id = :id
                """),
                {
                    "status": body.status,
                    "now": now,
                    "reason": (body.rejection_reason or "").strip() if body.status == "document_rejected" else None,
                    "id": id,
                }
            )
            
    if body.status == "document_approved":
        send_notifications([("document_approved", {})], applicant["user_id"])
    else:
        send_notifications([("document_rejected", {"alasan_penolakan": body.rejection_reason or ""})], applicant["user_id"])
        
    return {"success": True}
