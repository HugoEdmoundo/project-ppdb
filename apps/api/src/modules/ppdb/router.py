import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import audit_log, get_db
from src.core.dependencies import (
    require_ppdb_admin,
    require_ppdb_read,
)
from src.modules.ppdb.schemas import (
    ApplicantPasswordReset,
    ApplicantRegister,
    PeriodCreate,
    PeriodUpdate,
    WaveCreate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository
from src.services.ppdb_service import PPDBService

logger = logging.getLogger("ptdarrahman.ppdb")
router = APIRouter()


def get_ppdb_service(db: Session = Depends(get_db)) -> PPDBService:
    return PPDBService(PPDBRepository(db))


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------
@router.get("/periods")
def get_periods(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_periods(page, perPage, search)


@router.get("/periods/all")
def get_all_periods(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_all_periods()


@router.get("/periods/{id}")
def get_period_by_id(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_period_by_id(id)


@router.post("/periods", status_code=201)
def create_period(
    body: PeriodCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_period(body)


@router.put("/periods/{id}")
def update_period(
    id: str,
    body: PeriodUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_period(id, body)


@router.put("/periods/{id}/activate")
def activate_period(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.activate_period(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return result


@router.put("/periods/{id}/deactivate")
def deactivate_period(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.deactivate_period(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_periods",
        entity_id=id,
    )
    return result


@router.delete("/periods/{id}")
def delete_period_endpoint(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_period(id)


# ---------------------------------------------------------------------------
# Waves
# ---------------------------------------------------------------------------
@router.get("/waves")
def get_waves(
    period_id: str | None = Query(None),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_waves(period_id)


@router.get("/waves/all")
def get_all_waves(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_all_waves()


@router.get("/waves/active-public")
def get_active_wave_public(service: PPDBService = Depends(get_ppdb_service)):
    return service.get_active_wave_public()


@router.get("/waves/{id}")
def get_wave_by_id(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_wave_by_id(id)


@router.post("/waves", status_code=201)
def create_wave(
    body: WaveCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_wave(body)


@router.put("/waves/{id}")
def update_wave(
    id: str,
    body: WaveUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_wave(id, body)


@router.put("/waves/{id}/activate")
def activate_wave(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.activate_wave(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="activate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return result


@router.put("/waves/{id}/deactivate")
def deactivate_wave(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    result = service.deactivate_wave(id)
    audit_log(
        user_id=user.get("id"),
        user_username=user.get("username"),
        action="deactivate",
        entity_type="ppdb_waves",
        entity_id=id,
    )
    return result


@router.delete("/waves/{id}")
def delete_wave_endpoint(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_wave(id)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
@router.post("/register", status_code=201)
def register_applicant(
    body: ApplicantRegister, service: PPDBService = Depends(get_ppdb_service)
):
    return service.register_applicant(body)


# ---------------------------------------------------------------------------
# Applicants & dashboard
# ---------------------------------------------------------------------------
@router.get("/applicants")
def get_applicants(
    page: int = Query(1),
    perPage: int = Query(20),
    search: str = Query(""),
    wave_id: str | None = Query(None),
    status: str | None = Query(None),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicants(page, perPage, search, wave_id, status)


@router.put("/applicants/{id}/password")
def reset_applicant_password(
    id: str,
    body: ApplicantPasswordReset,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.reset_applicant_password(id, body.password)


@router.get("/dashboard/stats")
def get_ppdb_dashboard(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_dashboard_stats()


@router.post("/cron/soft-delete-expired")
def soft_delete_expired_applicants(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return service.soft_delete_expired_applicants()


@router.post("/cron/reminders")
def run_reminders(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    if x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    return service.run_reminders()
