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

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.repositories.selection_repository import SelectionRepository
from src.services.selection_service import SelectionService
from src.core.dependencies import get_current_user, require_ppdb_admin, require_ppdb_read
from src.modules.selection.schemas import (
    SessionCreate, SessionUpdate, BookSession, BroadcastSession,
    CategoryCreate, CriteriaCreate, ApplicantScoreSave, ApplicantStatusUpdate
)

router = APIRouter()

def get_selection_service(db: Session = Depends(get_db)) -> SelectionService:
    repo = SelectionRepository(db)
    return SelectionService(repo)

# ---------------------------------------------------------------------------
# Sessions (Admin)
# ---------------------------------------------------------------------------

@router.get("/sessions")
def get_sessions(
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.get_sessions()


@router.post("/sessions", status_code=201)
def create_session(
    body: SessionCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.create_session(body)


@router.put("/sessions/{session_id}")
def update_session(
    session_id: str,
    body: SessionUpdate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.update_session(session_id, body)


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.delete_session(session_id)


@router.post("/sessions/{session_id}/broadcast")
def broadcast_session(
    session_id: str,
    body: BroadcastSession,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.broadcast_session(session_id, body.message)


# ---------------------------------------------------------------------------
# Dynamic Categories & Criteria
# ---------------------------------------------------------------------------

@router.get("/categories")
def get_categories(
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.get_categories()


@router.post("/categories")
def create_category(
    body: CategoryCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.create_category(body)


@router.post("/categories/{category_id}/criteria")
def create_criteria(
    category_id: str,
    body: CriteriaCreate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.create_criteria(category_id, body)


@router.delete("/categories/{id}")
def delete_category(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.delete_category(id)


@router.delete("/criteria/{id}")
def delete_criteria(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.delete_criteria(id)


# ---------------------------------------------------------------------------
# Results (Dynamic Scores)
# ---------------------------------------------------------------------------

@router.get("/results")
def get_results(
    user: dict = Depends(require_ppdb_read),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.get_results()


@router.post("/results", status_code=200)
def save_result(
    body: ApplicantScoreSave,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.save_result(body)


@router.put("/results/{applicant_id}/status")
def update_applicant_status(
    applicant_id: str,
    body: ApplicantStatusUpdate,
    user: dict = Depends(require_ppdb_admin),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.update_applicant_status(applicant_id, body)


# ---------------------------------------------------------------------------
# Applicant Endpoints (Booking & View)
# ---------------------------------------------------------------------------

@router.get("/applicants/me/sessions")
def applicant_get_my_session(
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.applicant_get_my_session(user["id"])


@router.post("/applicants/me/book")
def applicant_book_session(
    body: BookSession,
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.applicant_book_session(user["id"], body.session_id)


@router.get("/applicants/me/results")
def applicant_get_my_results(
    user: dict = Depends(get_current_user),
    svc: SelectionService = Depends(get_selection_service)
):
    return svc.applicant_get_my_results(user["id"])


@router.post("/cron/auto-assign-sessions")
def auto_assign_sessions(
    x_cron_secret: str = Header(None),
    svc: SelectionService = Depends(get_selection_service)
):
    from src.core.config import settings
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return svc.auto_assign_sessions()


@router.post("/cron/h1-reminders")
def send_h1_reminders(
    x_cron_secret: str = Header(None),
    svc: SelectionService = Depends(get_selection_service)
):
    from src.core.config import settings
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return svc.send_h1_reminders()
