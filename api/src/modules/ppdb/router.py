import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text

from src.core.database import get_raw_pool, create_record, update_record, delete_record, audit_log
from src.modules.ppdb.dependencies import require_ppdb_read, require_ppdb_admin
from src.modules.ppdb.schemas import PeriodCreate, PeriodUpdate, WaveCreate, WaveUpdate

router = APIRouter()

@router.get("/periods")
def get_periods(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    user: dict = Depends(require_ppdb_read)
):
    pool = get_raw_pool()
    offset = (page - 1) * perPage
    
    sql = 'SELECT p.*, (SELECT COUNT(*) FROM ppdb_waves w WHERE w.period_id = p.id) as wave_count FROM ppdb_periods p'
    count_sql = 'SELECT COUNT(*) as cnt FROM ppdb_periods p'
    params = {}
    
    if search:
        sql += ' WHERE p.name LIKE :search'
        count_sql += ' WHERE p.name LIKE :search'
        params['search'] = f'%{search}%'
        
    sql += ' ORDER BY p.start_date DESC LIMIT :limit OFFSET :offset'
    params['limit'] = perPage
    params['offset'] = offset
    
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
        count_rows = conn.execute(text(count_sql), params).mappings().all()
        
    return {"data": [dict(r) for r in rows], "total": count_rows[0]['cnt']}

@router.get("/periods/all")
def get_all_periods(user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    sql = 'SELECT id, name, status, start_date, end_date FROM ppdb_periods ORDER BY start_date DESC'
    with pool.connect() as conn:
        rows = conn.execute(text(sql)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/periods/{id}")
def get_period_by_id(id: str, user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text('SELECT * FROM ppdb_periods WHERE id = :id LIMIT 1'), {"id": id}).mappings().all()
        if not rows:
            raise HTTPException(status_code=404, detail="Not found")
        period = dict(rows[0])
        waves = conn.execute(text('SELECT * FROM ppdb_waves WHERE period_id = :id ORDER BY wave_number ASC'), {"id": id}).mappings().all()
        period['waves'] = [dict(w) for w in waves]
    return period

@router.post("/periods", status_code=201)
def create_period(body: PeriodCreate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "id": f"period-{uuid.uuid4()}",
        "name": body.name,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "status": "inactive"
    }
    created = create_record("ppdb_periods", data)
    return created

@router.put("/periods/{id}")
def update_period(id: str, body: PeriodUpdate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "name": body.name,
        "start_date": body.start_date,
        "end_date": body.end_date
    }
    updated = update_record("ppdb_periods", id, data)
    return updated

@router.put("/periods/{id}/activate")
def activate_period(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.begin() as conn:
        try:
            conn.execute(text('UPDATE ppdb_periods SET status = "inactive"'))
            conn.execute(text('UPDATE ppdb_waves SET status = "inactive"'))
            conn.execute(text('UPDATE ppdb_periods SET status = "active" WHERE id = :id'), {"id": id})
        except Exception:
            raise HTTPException(status_code=500, detail="Transaction failed")
            
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
        try:
            conn.execute(text('UPDATE ppdb_periods SET status = "inactive" WHERE id = :id'), {"id": id})
            conn.execute(text('UPDATE ppdb_waves SET status = "inactive" WHERE period_id = :id'), {"id": id})
        except Exception:
            raise HTTPException(status_code=500, detail="Transaction failed")
            
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

@router.get("/waves")
def get_waves(period_id: Optional[str] = Query(None), user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    sql = 'SELECT * FROM ppdb_waves'
    params = {}
    if period_id:
        sql += ' WHERE period_id = :period_id'
        params['period_id'] = period_id
    sql += ' ORDER BY start_date ASC'
    
    with pool.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/waves/all")
def get_all_waves(user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    sql = 'SELECT * FROM ppdb_waves ORDER BY start_date ASC'
    with pool.connect() as conn:
        rows = conn.execute(text(sql)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/waves/{id}")
def get_wave_by_id(id: str, user: dict = Depends(require_ppdb_read)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        rows = conn.execute(text('SELECT * FROM ppdb_waves WHERE id = :id LIMIT 1'), {"id": id}).mappings().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(rows[0])

@router.post("/waves", status_code=201)
def create_wave(body: WaveCreate, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        period_rows = conn.execute(text('SELECT id FROM ppdb_periods WHERE id = :id'), {"id": body.period_id}).mappings().all()
        if not period_rows:
            raise HTTPException(status_code=404, detail="Period not found")
        
        max_rows = conn.execute(text('SELECT MAX(wave_number) as max_num FROM ppdb_waves WHERE period_id = :id'), {"id": body.period_id}).mappings().all()
        max_num = max_rows[0]['max_num'] if max_rows and max_rows[0]['max_num'] is not None else 0
        wave_number = max_num + 1

    data = {
        "id": f"wave-{uuid.uuid4()}",
        "period_id": body.period_id,
        "wave_number": wave_number,
        "name": body.name,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "status": "inactive"
    }
    created = create_record("ppdb_waves", data)
    return created

@router.put("/waves/{id}")
def update_wave(id: str, body: WaveUpdate, user: dict = Depends(require_ppdb_admin)):
    data = {
        "name": body.name,
        "start_date": body.start_date,
        "end_date": body.end_date
    }
    updated = update_record("ppdb_waves", id, data)
    return updated

@router.put("/waves/{id}/activate")
def activate_wave(id: str, user: dict = Depends(require_ppdb_admin)):
    pool = get_raw_pool()
    with pool.connect() as conn:
        wave_rows = conn.execute(text('SELECT period_id FROM ppdb_waves WHERE id = :id'), {"id": id}).mappings().all()
        if not wave_rows:
            raise HTTPException(status_code=404, detail="Wave not found")
        period_id = wave_rows[0]['period_id']
        
        period_rows = conn.execute(text('SELECT status FROM ppdb_periods WHERE id = :id'), {"id": period_id}).mappings().all()
        if not period_rows or period_rows[0]['status'] != 'active':
            raise HTTPException(status_code=400, detail="Periode belum aktif")

    with pool.begin() as conn:
        try:
            conn.execute(text('UPDATE ppdb_waves SET status = "inactive"'))
            conn.execute(text('UPDATE ppdb_waves SET status = "active" WHERE id = :id'), {"id": id})
        except Exception:
            raise HTTPException(status_code=500, detail="Transaction failed")
            
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
    pool = get_raw_pool()
    with pool.begin() as conn:
        conn.execute(text('UPDATE ppdb_waves SET status = "inactive" WHERE id = :id'), {"id": id})
    
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
