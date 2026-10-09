import hmac
import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import audit_log, get_db
from src.core.dependencies import (
    get_current_user,
    require_ppdb_admin,
    require_ppdb_read,
)
from src.core.rate_limit import rate_limit_dependency
from src.models.content import SiteSetting
from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantChangePath,
    ApplicantPasswordReset,
    ApplicantRegister,
    DocumentVerify,
    PeriodCreate,
    PeriodUpdate,
    TIUSettingsUpdate,
    WaveCreate,
    WaveFeeItemCreate,
    WaveFeeItemUpdate,
    WaveUpdate,
)
from src.repositories.ppdb_repository import PPDBRepository
from src.services.ppdb_service import PPDBService

logger = logging.getLogger("ptdarrahman.ppdb")
router = APIRouter()
WIB = ZoneInfo("Asia/Jakarta")


def _upsert_site_setting(db: Session, key: str, value: str, now: datetime) -> None:
    setting = db.get(SiteSetting, key)
    if setting:
        setting.value = value
        setting.updated_at = now
    else:
        db.add(SiteSetting(key=key, value=value, created_at=now, updated_at=now))


def _record_tiu_sync_status(
    db: Session, status: str, synced_at: str, error: str = ""
) -> None:
    now = datetime.now(WIB).replace(tzinfo=None)
    _upsert_site_setting(db, "ppdb_tiu_sync_status", status, now)
    _upsert_site_setting(db, "ppdb_tiu_sync_at", synced_at, now)
    _upsert_site_setting(db, "ppdb_tiu_sync_error", error[:1000], now)
    db.commit()


@router.get("/tiu-settings")
def get_tiu_settings(
    user: dict = Depends(require_ppdb_read), db: Session = Depends(get_db)
):
    keys = (
        "ppdb_tiu_google_form_url",
        "ppdb_tiu_duration_minutes",
        "ppdb_tiu_webhook_secret",
        "ppdb_tiu_sync_status",
        "ppdb_tiu_sync_at",
        "ppdb_tiu_sync_error",
        "ppdb_tiu_sync_question_count",
    )
    rows = db.query(SiteSetting).filter(SiteSetting.key.in_(keys)).all()
    values = {row.key: row.value or "" for row in rows}
    return {
        "google_form_url": values.get("ppdb_tiu_google_form_url", ""),
        "duration_minutes": values.get("ppdb_tiu_duration_minutes", ""),
        "webhook_secret_configured": bool(
            values.get("ppdb_tiu_webhook_secret") or settings.tiu_webhook_secret
        ),
        "sync_status": values.get("ppdb_tiu_sync_status", "not_synced"),
        "sync_at": values.get("ppdb_tiu_sync_at", ""),
        "sync_error": values.get("ppdb_tiu_sync_error", ""),
        "sync_question_count": values.get("ppdb_tiu_sync_question_count", "0"),
    }


@router.put("/tiu-settings")
def update_tiu_settings(
    body: TIUSettingsUpdate,
    user: dict = Depends(require_ppdb_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(WIB).replace(tzinfo=None)
    values = {
        "ppdb_tiu_google_form_url": body.google_form_url,
        "ppdb_tiu_duration_minutes": str(body.duration_minutes),
    }
    if body.webhook_secret:
        values["ppdb_tiu_webhook_secret"] = body.webhook_secret
    for key, value in values.items():
        setting = db.get(SiteSetting, key)
        if setting:
            setting.value = value
            setting.updated_at = now
        else:
            db.add(SiteSetting(key=key, value=value, created_at=now, updated_at=now))
    db.commit()
    return {
        "google_form_url": body.google_form_url,
        "duration_minutes": body.duration_minutes,
        "webhook_secret_configured": bool(
            body.webhook_secret or settings.tiu_webhook_secret
        ),
    }


class TIUWebhookPayload(BaseModel):
    token: str
    score: float


@router.post("/webhook/tiu")
def tiu_webhook(
    payload: TIUWebhookPayload,
    x_tiu_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    from src.core.config import settings
    from src.models.ppdb import PPDBTIUAttempt
    from src.models.selection import (
        SelectionCategory,
        SelectionCriteria,
        SelectionScore,
    )

    configured = db.get(SiteSetting, "ppdb_tiu_webhook_secret")
    expected = (configured.value if configured else None) or settings.tiu_webhook_secret
    if (
        not expected
        or not x_tiu_secret
        or not hmac.compare_digest(expected.strip(), x_tiu_secret.strip())
    ):
        raise HTTPException(status_code=401, detail="Secret tidak valid")

    attempt = (
        db.query(PPDBTIUAttempt).filter(PPDBTIUAttempt.token == payload.token).first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt tidak ditemukan")

    duration_setting = db.get(SiteSetting, "ppdb_tiu_duration_minutes")
    duration_minutes = (
        int(duration_setting.value)
        if duration_setting and duration_setting.value
        else 120
    )

    now = datetime.now()
    if (now - attempt.created_at).total_seconds() > (duration_minutes + 5) * 60:
        raise HTTPException(status_code=400, detail="Ujian melewati batas waktu")

    # Save score to applicant's selection result
    # We need category "TIU", criteria "Google Form"
    # Or create it if it doesn't exist? Since this is a webhook, let's assume
    # active wave
    from src.models.ppdb import PPDBApplicant

    applicant = (
        db.query(PPDBApplicant).filter(PPDBApplicant.id == attempt.applicant_id).first()
    )
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    category = (
        db.query(SelectionCategory)
        .filter(
            SelectionCategory.wave_id == applicant.wave_id,
            SelectionCategory.name.ilike("%TIU%"),
        )
        .first()
    )
    if not category:
        import uuid

        category = SelectionCategory(
            id=str(uuid.uuid4()),
            wave_id=applicant.wave_id,
            name="TIU",
            created_at=now,
            updated_at=now,
        )
        db.add(category)
        db.commit()

    criteria = (
        db.query(SelectionCriteria)
        .filter(
            SelectionCriteria.category_id == category.id,
            SelectionCriteria.name.ilike("%Google Form%"),
        )
        .first()
    )
    if not criteria:
        import uuid

        criteria = SelectionCriteria(
            id=str(uuid.uuid4()),
            category_id=category.id,
            name="Google Form",
            weight=100.0,
            created_at=now,
            updated_at=now,
        )
        db.add(criteria)
        db.commit()

    score_entry = (
        db.query(SelectionScore)
        .filter(
            SelectionScore.applicant_id == applicant.id,
            SelectionScore.criteria_id == criteria.id,
        )
        .first()
    )
    if score_entry:
        score_entry.score = payload.score
        score_entry.updated_at = now
    else:
        import uuid

        score_entry = SelectionScore(
            id=str(uuid.uuid4()),
            applicant_id=applicant.id,
            criteria_id=criteria.id,
            score=payload.score,
            created_at=now,
            updated_at=now,
        )
        db.add(score_entry)

    db.commit()

    try:
        from src.core.notif_service import send_notification

        score_str = str(
            int(payload.score) if float(payload.score).is_integer() else payload.score
        )
        send_notification(
            event_key="tiu_result_ready",
            recipient_user_id=applicant.user_id,
            context={
                "nilai_tiu": score_str,
                "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
            },
        )
    except Exception:
        pass

    return {"status": "success", "score": payload.score}


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
# Wave fee items (Biaya Tahap 2 per gelombang)
# ---------------------------------------------------------------------------
@router.get("/waves/{id}/fee-items")
def get_wave_fee_items(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_wave_fee_items(id)


@router.post("/waves/{id}/fee-items", status_code=201)
def create_wave_fee_item(
    id: str,
    body: WaveFeeItemCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.create_wave_fee_item(id, body)


@router.delete("/waves/{id}/fee-items/{item_id}")
def delete_wave_fee_item(
    id: str,
    item_id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_wave_fee_item(id, item_id)


@router.put("/waves/{id}/fee-items/{item_id}")
def update_wave_fee_item(
    id: str,
    item_id: str,
    body: WaveFeeItemUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_wave_fee_item(id, item_id, body)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
@router.post("/register", status_code=201)
def register_applicant(
    body: ApplicantRegister,
    service: PPDBService = Depends(get_ppdb_service),
    _: None = Depends(rate_limit_dependency("register")),
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
    period_id: str | None = Query(None),
    payment_status: str | None = Query(None),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Daftar pendaftar.

    Tanpa filter, seluruh pendaftar dari semua periode & gelombang dikembalikan.
    ``wave_id="active"`` untuk membatasi ke gelombang aktif saja.
    """
    return service.get_applicants(
        page, perPage, search, wave_id, status, period_id, payment_status
    )


@router.post("/applicants", status_code=201)
def create_applicant(
    body: ApplicantAdminCreate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    """Buat pendaftar dari panel admin. Kredensial dibuat sistem."""
    return service.create_applicant(body)


@router.get("/applicants/{id}")
def get_applicant(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant(id)


@router.put("/applicants/{id}")
def update_applicant(
    id: str,
    body: ApplicantAdminUpdate,
    ApplicantChangePath,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_applicant(id, body)


@router.delete("/applicants/{id}")
def delete_applicant(
    id: str,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.delete_applicant(id)


@router.put("/applicants/{id}/password")
def reset_applicant_password(
    id: str,
    body: ApplicantPasswordReset,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.reset_applicant_password(id, body.password)


# ─────────────────────────────────────────────────────────────────────────────
# Dokumen Pendaftar
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/applicants/me/path")
def change_my_path(
    body: ApplicantChangePath,
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.change_my_path(user["id"], body.registration_path)


@router.get("/documents")
def get_my_documents(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_my_documents(user["id"])


@router.post("/documents/upload")
async def upload_ppdb_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return await service.upload_document(user, doc_type, file)


@router.post("/documents/submit")
def submit_ppdb_documents(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.submit_documents(user)


@router.get("/applicants/{id}/documents")
def get_applicant_documents(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_documents_admin(id)


@router.post("/applicants/{id}/documents/verify")
def verify_applicant_documents(
    id: str,
    body: DocumentVerify,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.verify_applicant_documents(id, body.status, body.rejection_reason)


@router.get("/applicants/{id}/transcript")
def get_applicant_transcript(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_transcript(id)


@router.get("/applicants/{id}/loa")
def get_applicant_loa(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_loa(id)


@router.get("/applicants/{id}/skd")
def get_applicant_skd(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_skd(id)


# ─────────────────────────────────────────────────────────────────────────────
# Arsip / Dossier Pendaftar (Lintas Periode & Gelombang)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/archive/applicants")
def get_archive_applicants(
    period_id: str | None = Query(None),
    wave_id: str | None = Query(None),
    search: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_archive_applicants(
        period_id=period_id,
        wave_id=wave_id,
        search=search,
        status=status,
        page=page,
        per_page=perPage,
    )


@router.get("/archive/applicants/{id}/dossier")
def get_applicant_dossier(
    id: str,
    request: Request,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    ip_addr = request.client.host if request.client else None
    return service.get_applicant_dossier(id, admin_user=user, ip_address=ip_addr)


@router.get("/archive/applicants/{id}/dossier/zip")
def download_applicant_dossier_zip(
    id: str,
    request: Request,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    import io

    ip_addr = request.client.host if request.client else None
    zip_bytes, zip_filename = service.export_applicant_dossier_zip(
        id, admin_user=user, ip_address=ip_addr
    )
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


# Rute /applicants/me/* didaftarkan SEBELUM /applicants/{id} agar "me"
# tidak ditangkap sebagai id.
@router.get("/applicants/me/loa")
def get_my_loa(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    # This directly delegates to the existing get_applicant_loa but looks up
    # the applicant by user id
    applicant = service.repository.get_applicant_by_user_id(user["id"])
    if not applicant:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    return service.get_applicant_loa(applicant.id)


@router.get("/dashboard/stats")
def get_ppdb_dashboard(
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_dashboard_stats()


def _verify_cron_secret(provided: str | None) -> None:
    """
    Verifikasi cron secret dengan constant-time comparison (mencegah timing attack).
    Raises HTTP 401 jika secret tidak valid atau belum dikonfigurasi.
    """
    import hmac as _hmac

    expected = settings.cron_secret
    if not expected:
        raise HTTPException(status_code=401, detail="Cron secret belum dikonfigurasi")
    if not provided:
        raise HTTPException(status_code=401, detail="Unauthorized cron request")
    # constant-time compare — mencegah timing side-channel
    if not _hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized cron request")


@router.post("/cron/soft-delete-expired")
def soft_delete_expired_applicants(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    _verify_cron_secret(x_cron_secret)
    return service.soft_delete_expired_applicants()


@router.post("/cron/reminders")
def run_reminders(
    x_cron_secret: str = Header(None), service: PPDBService = Depends(get_ppdb_service)
):
    _verify_cron_secret(x_cron_secret)
    return service.run_reminders()
