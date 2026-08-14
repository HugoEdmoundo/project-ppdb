import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from src.core.database import (
    audit_log,
    create_record,
    delete_record,
    execute_raw,
    get_raw_pool,
    update_record,
)
from src.core.notif_service import send_notification
from src.core.dependencies import require_ppdb_admin, require_ppdb_read
from src.core.security import hash_password
from src.modules.ppdb.schemas import (
    ApplicantRegister,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveUpdate,
)

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


def generate_username(full_name: str) -> str:
    base = "".join(c for c in full_name.split(" ")[0].lower() if c.isalnum())
    return f"{base}{''.join(random.choice(string.digits) for _ in range(4))}"


@router.post("/register", status_code=201)
def register_applicant(body: ApplicantRegister):
    pool = get_raw_pool()
    with pool.connect() as conn:
        wave_rows = conn.execute(
            text('SELECT id FROM ppdb_waves WHERE status = "active" LIMIT 1')
        ).mappings().all()
        if not wave_rows:
            raise HTTPException(status_code=400, detail="Pendaftaran saat ini sedang ditutup atau belum dibuka.")
        active_wave_id = wave_rows[0]["id"]

        existing = conn.execute(
            text('SELECT id FROM ppdb_applicants WHERE email = :email AND status != "expired" LIMIT 1'),
            {"email": body.email},
        ).mappings().all()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar. Silakan login atau gunakan email lain.")

    raw_password = generate_random_password()
    username = generate_username(body.full_name)

    created_user = create_record(
        "users",
        {
            "id": str(uuid.uuid4()),
            "username": username,
            "password_hash": hash_password(raw_password),
            "email": body.email,
            "full_name": body.full_name,
            "user_type": "applicant",
        },
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
    )

    # Buat transaksi pembayaran offline dengan status pending
    create_record(
        "ppdb_payment_transactions",
        {
            "id": f"pay-{uuid.uuid4()}",
            "applicant_id": created_applicant["id"],
            "method": "offline",
            "amount": 0,  # Akan di-update sesuai nominal pendaftaran
            "status": "pending",
        }
    )

    # Kirim notifikasi welcome
    send_notification("welcome", created_user["id"], {
        "password": raw_password,
        "link_login": "https://ppdb.ptdarrahman.sch.id/auth/login", # TBD
        "batas_waktu_bayar": created_applicant["payment_deadline"],
    })

    # Kirim notifikasi pengingat pembayaran formulir
    send_notification("payment_reminder", created_user["id"], {
        "link_pembayaran": "https://ppdb.ptdarrahman.sch.id/checkout", # TBD
        "batas_waktu_bayar": created_applicant["payment_deadline"],
    })

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

    sql = "SELECT a.*, w.name as wave_name FROM ppdb_applicants a LEFT JOIN ppdb_waves w ON a.wave_id = w.id WHERE 1=1"
    count_sql = "SELECT COUNT(*) as cnt FROM ppdb_applicants a WHERE 1=1"
    params: dict = {}

    if search:
        sql += " AND (a.full_name LIKE :search OR a.email LIKE :search)"
        count_sql += " AND (a.full_name LIKE :search OR a.email LIKE :search)"
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
        send_notification("payment_expired", user_id, {})
        
    return {"deleted": len(applicant_ids), "applicant_ids": applicant_ids}

