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

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import get_db
from src.core.dependencies import (
    get_current_user,
    require_ppdb_admin,
    require_ppdb_read,
)
from src.models.ppdb import PPDBApplicant, PPDBTIUAttempt
from src.modules.ppdb.router import get_tiu_settings
from src.modules.selection.schemas import (
    ApplicantScoreSave,
    ApplicantStatusUpdate,
    BookSession,
    BroadcastSession,
    CategoryCreate,
    CriteriaCreate,
    CriteriaUpdate,
    SessionCreate,
    SessionUpdate,
)
from src.repositories.selection_repository import SelectionRepository
from src.services.selection_service import SelectionService

router = APIRouter()


def get_selection_service(db: Session = Depends(get_db)) -> SelectionService:
    repo = SelectionRepository(db)
    return SelectionService(repo)


# ---------------------------------------------------------------------------
# Sessions (Admin)
# ---------------------------------------------------------------------------


@router.get("/sessions")
def get_sessions(
    session_type: str | None = Query(None, alias="type"),
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service),
):
    active_wave = svc.repo.get_active_wave_info()
    if not active_wave:
        return {"data": [], "total": 0, "active_wave": None}
    data = svc.get_sessions(session_type=session_type)
    return {"data": data, "total": len(data), "active_wave": active_wave}


@router.get("/sessions/{session_id}/evaluation")
def get_session_evaluation_detail(
    session_id: str,
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.get_session_evaluation_detail(session_id)


@router.post("/sessions", status_code=201)
def create_session(
    body: SessionCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.create_session(body, creator_user_id=user.get("id"))


@router.put("/sessions/{session_id}")
def update_session(
    session_id: str,
    body: SessionUpdate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.update_session(session_id, body)


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.delete_session(session_id)


@router.post("/sessions/{session_id}/broadcast")
def broadcast_session(
    session_id: str,
    body: BroadcastSession,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.broadcast_session(session_id, body.message)


# ---------------------------------------------------------------------------
# Dynamic Categories & Criteria
# ---------------------------------------------------------------------------


@router.get("/categories")
def get_categories(
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service),
):
    data = svc.get_categories()
    return {"data": data, "total": len(data)}


@router.post("/categories")
def create_category(
    body: CategoryCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.create_category(body)


@router.post("/categories/{category_id}/criteria")
def create_criteria(
    category_id: str,
    body: CriteriaCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.create_criteria(category_id, body)


@router.put("/criteria/{criteria_id}")
def update_criteria(
    criteria_id: str,
    body: CriteriaUpdate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.update_criteria(criteria_id, body)


@router.delete("/categories/{id}")
def delete_category(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.delete_category(id)


@router.delete("/criteria/{id}")
def delete_criteria(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.delete_criteria(id)


@router.get("/results")
def get_results(
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service),
):
    active_wave = svc.repo.get_active_wave_info()
    if not active_wave:
        return {"data": [], "total": 0, "active_wave": None}
    data = svc.get_results()
    return {"data": data, "total": len(data), "active_wave": active_wave}


@router.post("/results")
def save_result(
    body: ApplicantScoreSave,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.save_result(body)


@router.get("/results/{applicant_id}")
def get_result_by_applicant(
    applicant_id: str,
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.get_result_by_applicant(applicant_id)


@router.put("/applicants/{applicant_id}/status")
def update_applicant_selection_status(
    applicant_id: str,
    body: ApplicantStatusUpdate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.update_applicant_status(applicant_id, body)


# ---------------------------------------------------------------------------
# Applicant Endpoints (Booking & View)
# ---------------------------------------------------------------------------


@router.get("/applicants/me/sessions")
def applicant_get_my_session(
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.applicant_get_my_session(user["id"])


@router.post("/applicants/me/book")
def applicant_book_session(
    body: BookSession,
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.applicant_book_session(user["id"], body.session_id)


@router.get("/applicants/me/results")
def applicant_get_my_results(
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service),
):
    return svc.applicant_get_my_results(user["id"])


@router.post("/cron/auto-assign-sessions")
def auto_assign_sessions(
    x_cron_secret: str = Header(None),
    svc: SelectionService = Depends(get_selection_service),
):
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return svc.auto_assign_sessions()


@router.post("/cron/h1-reminders")
def send_h1_reminders(
    x_cron_secret: str = Header(None),
    svc: SelectionService = Depends(get_selection_service),
):
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return svc.send_h1_reminders()


@router.get("/applicants/me/tiu-seb")
def generate_tiu_seb(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    applicant = (
        db.query(PPDBApplicant).filter(PPDBApplicant.user_id == user["id"]).first()
    )
    if not applicant:
        raise HTTPException(status_code=404, detail="Bukan pendaftar")

    tiu_settings = get_tiu_settings(user, db)
    google_form_url = tiu_settings.get("google_form_url", "")
    if not google_form_url:
        raise HTTPException(
            status_code=400, detail="URL Google Form TIU belum dikonfigurasi"
        )

    from src.models.content import SiteSetting
    from src.models.selection import (
        SelectionCategory,
        SelectionCriteria,
        SelectionScore,
    )

    existing_attempt = (
        db.query(PPDBTIUAttempt)
        .filter(PPDBTIUAttempt.applicant_id == applicant.id)
        .order_by(PPDBTIUAttempt.created_at.desc())
        .first()
    )
    duration_setting = db.get(SiteSetting, "ppdb_tiu_duration_minutes")
    duration_minutes = (
        int(duration_setting.value)
        if duration_setting and duration_setting.value
        else 120
    )

    # Cek apakah nilai TIU sudah masuk
    has_score = (
        db.query(SelectionScore)
        .join(SelectionCriteria, SelectionCriteria.id == SelectionScore.criteria_id)
        .join(SelectionCategory, SelectionCategory.id == SelectionCriteria.category_id)
        .filter(
            SelectionScore.applicant_id == applicant.id,
            SelectionCategory.name.ilike("%TIU%"),
        )
        .first()
    )
    if has_score:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ujian TIU sudah selesai dan nilai Anda telah tersimpan. "
                "Tidak ada ujian ulang (retake)."
            ),
        )

    now = datetime.now()
    if existing_attempt:
        if (now - existing_attempt.created_at).total_seconds() > duration_minutes * 60:
            raise HTTPException(
                status_code=400,
                detail="Waktu ujian TIU Anda telah habis. Ujian tidak dapat diulang.",
            )
        token = existing_attempt.token
    else:
        token = str(uuid.uuid4())
        attempt = PPDBTIUAttempt(
            id=str(uuid.uuid4()), applicant_id=applicant.id, token=token, created_at=now
        )
        db.add(attempt)
        db.commit()

    start_url = google_form_url.replace("{token}", token)

    seb_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>startURL</key>
    <string>{start_url}</string>
  </dict>
</plist>"""

    return Response(
        content=seb_xml,
        media_type="application/seb",
        headers={"Content-Disposition": "attachment; filename=ujian-tiu.seb"},
    )
