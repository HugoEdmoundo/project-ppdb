"""
Selection module router.

Endpoint coverage:
  Admin:
    GET  /selection/sessions            - list sesi per wave
    POST /selection/sessions            - buat sesi
    PUT  /selection/sessions/{id}       - update sesi
    DELETE /selection/sessions/{id}     - hapus sesi
    POST /selection/sessions/{id}/broadcast - kirim notif ke peserta di sesi ini

    GET  /selection/categories          - list kategori & kriteria (per wave)
    POST /selection/categories          - buat kategori
    POST /selection/criteria            - buat kriteria dalam kategori
    DELETE /selection/categories/{id}   - hapus kategori
    DELETE /selection/criteria/{id}     - hapus kriteria

    GET  /selection/results             - list peserta, sesi, nilai dinamis
    POST /selection/results             - simpan/update nilai dinamis & notes

  Applicant:
    GET  /selection/applicants/me/sessions    - info sesi milik applicant yang login
    POST /selection/applicants/me/book        - pilih/booking sesi
    GET  /selection/applicants/me/results     - nilai dinamis milik applicant yang login
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query

from src.core.database import execute_raw, get_raw_pool
from src.core.dependencies import get_current_user, require_ppdb_admin, require_ppdb_read
from src.core.notif_service import send_notifications
from src.modules.selection.schemas import (
    SessionCreate, SessionUpdate, BookSession, BroadcastSession,
    CategoryCreate, CriteriaCreate, ApplicantScoreSave
)
from sqlalchemy import text

router = APIRouter()
WIB = ZoneInfo("Asia/Jakarta")

def _now_wib() -> datetime:
    return datetime.now(WIB).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Sessions (Admin)
# ---------------------------------------------------------------------------

@router.get("/sessions")
def get_sessions(
    wave_id: Optional[str] = Query(None),
    user: dict = Depends(require_ppdb_read),
):
    pool = get_raw_pool()
    with pool.connect() as conn:
        sql = """
            SELECT s.*, w.name as wave_name,
                   (SELECT COUNT(*) FROM selection_results sr WHERE sr.session_id = s.id) as booked_count
            FROM selection_sessions s
            LEFT JOIN ppdb_waves w ON s.wave_id = w.id
            WHERE 1=1
        """
        params: dict = {}
        if wave_id:
            sql += " AND s.wave_id = :wave_id"
            params["wave_id"] = wave_id
        sql += " ORDER BY s.session_date ASC, s.start_time ASC"
        rows = conn.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/sessions", status_code=201)
def create_session(body: SessionCreate, user: dict = Depends(require_ppdb_admin)):
    now = _now_wib()
    sid = str(uuid4())
    pool = get_raw_pool()
    with pool.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO selection_sessions
                  (id, wave_id, name, session_date, start_time, end_time, location, description, quota, created_at, updated_at)
                VALUES
                  (:id, :wave_id, :name, :session_date, :start_time, :end_time, :location, :description, :quota, :created_at, :updated_at)
            """),
            {
                "id": sid,
                "wave_id": body.wave_id,
                "name": body.name,
                "session_date": body.session_date,
                "start_time": body.start_time,
                "end_time": body.end_time,
                "location": body.location,
                "description": body.description,
                "quota": body.quota,
                "created_at": now,
                "updated_at": now,
            },
        )
        conn.commit()
    return {"id": sid, "message": "Sesi seleksi berhasil dibuat"}


@router.put("/sessions/{session_id}")
def update_session(session_id: str, body: SessionUpdate, user: dict = Depends(require_ppdb_admin)):
    now = _now_wib()
    pool = get_raw_pool()
    with pool.connect() as conn:
        row = conn.execute(text("SELECT id FROM selection_sessions WHERE id = :id"), {"id": session_id}).first()
        if not row:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        conn.execute(
            text("""
                UPDATE selection_sessions
                SET name = :name, session_date = :session_date, start_time = :start_time,
                    end_time = :end_time, location = :location, description = :description,
                    quota = :quota, updated_at = :updated_at
                WHERE id = :id
            """),
            {
                "id": session_id,
                "name": body.name,
                "session_date": body.session_date,
                "start_time": body.start_time,
                "end_time": body.end_time,
                "location": body.location,
                "description": body.description,
                "quota": body.quota,
                "updated_at": now,
            },
        )
        conn.commit()
    return {"message": "Sesi berhasil diperbarui"}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        row = conn.execute(text("SELECT id FROM selection_sessions WHERE id = :id"), {"id": session_id}).first()
        if not row:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        conn.execute(
            text("UPDATE selection_results SET session_id = NULL WHERE session_id = :sid"),
            {"sid": session_id},
        )
        conn.execute(text("DELETE FROM selection_sessions WHERE id = :id"), {"id": session_id})
        conn.commit()
    return {"message": "Sesi berhasil dihapus"}


@router.post("/sessions/{session_id}/broadcast")
def broadcast_session(session_id: str, body: BroadcastSession, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        session = conn.execute(text("SELECT * FROM selection_sessions WHERE id = :id"), {"id": session_id}).mappings().first()
        if not session:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
        # Get all users in this session
        applicants = conn.execute(
            text("""
                SELECT a.user_id 
                FROM selection_results sr 
                JOIN ppdb_applicants a ON sr.applicant_id = a.id 
                WHERE sr.session_id = :sid
            """),
            {"sid": session_id}
        ).mappings().all()
        
        for app in applicants:
            send_notifications(
                [("selection_session_broadcast", {"custom_message": body.message, "session_name": session["name"]})],
                app["user_id"]
            )
            
    return {"message": f"Notifikasi berhasil dikirim ke {len(applicants)} peserta."}


# ---------------------------------------------------------------------------
# Dynamic Categories & Criteria
# ---------------------------------------------------------------------------

@router.get("/categories")
def get_categories(
    wave_id: Optional[str] = Query(None),
    user: dict = Depends(require_ppdb_read)
):
    pool = get_raw_pool()
    with pool.connect() as conn:
        sql = "SELECT * FROM selection_categories"
        params = {}
        if wave_id:
            sql += " WHERE wave_id = :wave_id"
            params["wave_id"] = wave_id
        sql += " ORDER BY created_at ASC"
        
        cats = conn.execute(text(sql), params).mappings().all()
        result = []
        for c in cats:
            c_dict = dict(c)
            # get criteria
            crits = conn.execute(
                text("SELECT * FROM selection_criteria WHERE category_id = :cid ORDER BY created_at ASC"),
                {"cid": c["id"]}
            ).mappings().all()
            c_dict["criteria"] = [dict(cr) for cr in crits]
            result.append(c_dict)
            
    return result

@router.post("/categories")
def create_category(body: CategoryCreate, user: dict = Depends(require_ppdb_admin)):
    now = _now_wib()
    cid = str(uuid4())
    pool = get_raw_pool()
    with pool.connect() as conn:
        conn.execute(
            text("INSERT INTO selection_categories (id, wave_id, name, created_at, updated_at) VALUES (:id, :wid, :name, :now, :now)"),
            {"id": cid, "wid": body.wave_id, "name": body.name, "now": now}
        )
        conn.commit()
    return {"id": cid, "message": "Kategori berhasil dibuat"}

@router.post("/categories/{category_id}/criteria")
def create_criteria(category_id: str, body: CriteriaCreate, user: dict = Depends(require_ppdb_admin)):
    now = _now_wib()
    crid = str(uuid4())
    pool = get_raw_pool()
    with pool.connect() as conn:
        conn.execute(
            text("INSERT INTO selection_criteria (id, category_id, name, max_score, created_at, updated_at) VALUES (:id, :cid, :name, :max, :now, :now)"),
            {"id": crid, "cid": category_id, "name": body.name, "max": body.max_score, "now": now}
        )
        conn.commit()
    return {"id": crid, "message": "Kriteria berhasil ditambahkan"}

@router.delete("/categories/{id}")
def delete_category(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        conn.execute(text("DELETE FROM selection_scores WHERE criteria_id IN (SELECT id FROM selection_criteria WHERE category_id = :id)"), {"id": id})
        conn.execute(text("DELETE FROM selection_criteria WHERE category_id = :id"), {"id": id})
        conn.execute(text("DELETE FROM selection_categories WHERE id = :id"), {"id": id})
        conn.commit()
    return {"message": "Kategori dihapus"}

@router.delete("/criteria/{id}")
def delete_criteria(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        conn.execute(text("DELETE FROM selection_scores WHERE criteria_id = :id"), {"id": id})
        conn.execute(text("DELETE FROM selection_criteria WHERE id = :id"), {"id": id})
        conn.commit()
    return {"message": "Kriteria dihapus"}


# ---------------------------------------------------------------------------
# Results (Dynamic Scores)
# ---------------------------------------------------------------------------

@router.get("/results")
def get_results(
    wave_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    user: dict = Depends(require_ppdb_read),
):
    pool = get_raw_pool()
    with pool.connect() as conn:
        sql = """
            SELECT
                sr.id as result_id, sr.applicant_id, sr.session_id, sr.notes,
                a.full_name, a.email, a.phone, a.registration_path, a.registration_level,
                a.status as applicant_status,
                s.name as session_name, s.session_date, s.location,
                w.name as wave_name
            FROM selection_results sr
            JOIN ppdb_applicants a ON sr.applicant_id = a.id
            LEFT JOIN selection_sessions s ON sr.session_id = s.id
            LEFT JOIN ppdb_waves w ON a.wave_id = w.id
            WHERE 1=1
        """
        params: dict = {}
        if wave_id:
            sql += " AND a.wave_id = :wave_id"
            params["wave_id"] = wave_id
        if session_id:
            sql += " AND sr.session_id = :session_id"
            params["session_id"] = session_id
        sql += " ORDER BY a.full_name ASC"
        
        rows = conn.execute(text(sql), params).mappings().all()
        
        # Get dynamic scores for all matched applicants
        results = []
        for r in rows:
            rd = dict(r)
            scores = conn.execute(
                text("SELECT criteria_id, score FROM selection_scores WHERE applicant_id = :aid"),
                {"aid": r["applicant_id"]}
            ).mappings().all()
            rd["scores"] = [dict(sc) for sc in scores]
            results.append(rd)
            
    return results


@router.post("/results", status_code=200)
def save_result(body: ApplicantScoreSave, user: dict = Depends(require_ppdb_admin)):
    now = _now_wib()
    pool = get_raw_pool()
    with pool.connect() as conn:
        # Cek applicant
        app_row = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE id = :id AND deleted_at IS NULL"),
            {"id": body.applicant_id}
        ).first()
        if not app_row:
            raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
            
        # Update notes in selection_results
        conn.execute(
            text("UPDATE selection_results SET notes = :notes, updated_at = :now WHERE applicant_id = :aid"),
            {"notes": body.notes, "now": now, "aid": body.applicant_id}
        )

        # Upsert dynamic scores
        for sc in body.scores:
            existing = conn.execute(
                text("SELECT id FROM selection_scores WHERE applicant_id = :aid AND criteria_id = :cid"),
                {"aid": body.applicant_id, "cid": sc.criteria_id}
            ).first()
            if existing:
                conn.execute(
                    text("UPDATE selection_scores SET score = :score, updated_at = :now WHERE id = :id"),
                    {"score": sc.score, "now": now, "id": existing[0]}
                )
            else:
                conn.execute(
                    text("INSERT INTO selection_scores (id, applicant_id, criteria_id, score, created_at, updated_at) VALUES (:id, :aid, :cid, :sc, :now, :now)"),
                    {"id": str(uuid4()), "aid": body.applicant_id, "cid": sc.criteria_id, "sc": sc.score, "now": now}
                )
        conn.commit()
    return {"message": "Nilai berhasil disimpan"}


# ---------------------------------------------------------------------------
# Applicant Endpoints (Booking & View)
# ---------------------------------------------------------------------------

@router.get("/applicants/me/sessions")
def applicant_get_my_session(user: dict = Depends(get_current_user)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        app = conn.execute(
            text("SELECT id, wave_id FROM ppdb_applicants WHERE user_id = :uid LIMIT 1"),
            {"uid": user["id"]}
        ).mappings().first()
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")
            
        res = conn.execute(
            text("SELECT session_id FROM selection_results WHERE applicant_id = :aid"),
            {"aid": app["id"]}
        ).mappings().first()
        
        my_session = None
        if res and res["session_id"]:
            s_row = conn.execute(
                text("SELECT * FROM selection_sessions WHERE id = :sid"),
                {"sid": res["session_id"]}
            ).mappings().first()
            if s_row:
                my_session = dict(s_row)
                
        # Get available sessions for their wave
        av_sql = """
            SELECT s.*, 
                   (SELECT COUNT(*) FROM selection_results sr WHERE sr.session_id = s.id) as booked_count
            FROM selection_sessions s 
            WHERE s.wave_id = :wid
            ORDER BY s.session_date ASC, s.start_time ASC
        """
        available = conn.execute(text(av_sql), {"wid": app["wave_id"]}).mappings().all()
        
    return {
        "session": my_session,
        "available_sessions": [dict(av) for av in available]
    }


@router.post("/applicants/me/book")
def applicant_book_session(body: BookSession, user: dict = Depends(get_current_user)):
    now = _now_wib()
    pool = get_raw_pool()
    with pool.connect() as conn:
        app = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :uid LIMIT 1"),
            {"uid": user["id"]}
        ).mappings().first()
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")
            
        session = conn.execute(
            text("SELECT id, quota, name, (SELECT COUNT(*) FROM selection_results sr WHERE sr.session_id = selection_sessions.id) as booked_count FROM selection_sessions WHERE id = :sid"),
            {"sid": body.session_id}
        ).mappings().first()
        if not session:
            raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
            
        if session["quota"] > 0 and session["booked_count"] >= session["quota"]:
            raise HTTPException(status_code=400, detail="Kuota sesi ini sudah penuh")
            
        conn.execute(
            text("UPDATE selection_results SET session_id = :sid, updated_at = :now WHERE applicant_id = :aid"),
            {"sid": body.session_id, "now": now, "aid": app["id"]}
        )
        conn.commit()
    return {"message": f"Berhasil memilih {session['name']}"}


@router.get("/applicants/me/results")
def applicant_get_my_results(user: dict = Depends(get_current_user)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        app = conn.execute(
            text("SELECT id FROM ppdb_applicants WHERE user_id = :uid LIMIT 1"),
            {"uid": user["id"]}
        ).mappings().first()
        if not app:
            raise HTTPException(status_code=404, detail="Bukan pendaftar")
            
        res_row = conn.execute(
            text("SELECT notes FROM selection_results WHERE applicant_id = :aid"),
            {"aid": app["id"]}
        ).mappings().first()
        
        scores_rows = conn.execute(
            text("""
                SELECT s.score, c.name as criteria_name, cat.name as category_name
                FROM selection_scores s
                JOIN selection_criteria c ON s.criteria_id = c.id
                JOIN selection_categories cat ON c.category_id = cat.id
                WHERE s.applicant_id = :aid
                ORDER BY cat.created_at, c.created_at
            """),
            {"aid": app["id"]}
        ).mappings().all()
        
    return {
        "notes": res_row["notes"] if res_row else None,
        "scores": [dict(s) for s in scores_rows]
    }
