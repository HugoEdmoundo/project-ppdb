import hmac
import json
import logging
import uuid
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
from pydantic import ValidationError
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.database import audit_log, get_db
from src.core.dependencies import (
    get_current_user,
    require_ppdb_admin,
    require_ppdb_read,
)
from src.core.rate_limit import rate_limit_dependency
from src.core.uploads import delete_upload, upload_file
from src.models.content import SiteSetting
from src.models.ppdb import FileUpload
from src.modules.ppdb.schemas import (
    ApplicantAdminCreate,
    ApplicantAdminUpdate,
    ApplicantPasswordReset,
    ApplicantRegister,
    DocumentVerify,
    MouSignRequest,
    PeriodCreate,
    PeriodUpdate,
    TIUQuestionSyncPayload,
    TIUSettingsUpdate,
    WaveCreate,
    WaveFeeItemCreate,
    WaveFeeItemUpdate,
    WaveMouTemplateUpdate,
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


@router.post("/tiu-questions/sync")
async def sync_tiu_questions(
    request: Request,
    x_tiu_secret: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    configured = db.get(SiteSetting, "ppdb_tiu_webhook_secret")
    expected = (configured.value if configured else None) or settings.tiu_webhook_secret
    if (
        not expected
        or not x_tiu_secret
        or not hmac.compare_digest(expected.strip(), x_tiu_secret.strip())
    ):
        raise HTTPException(
            status_code=401, detail="Secret sinkronisasi TIU tidak valid"
        )

    attempt_time = datetime.now(WIB).isoformat(timespec="seconds")
    _record_tiu_sync_status(db, "syncing", attempt_time)

    try:
        raw_payload = json.loads(await request.body())
        if isinstance(raw_payload, dict) and raw_payload.get("error"):
            raise ValueError(str(raw_payload["error"])[:1000])
        payload = TIUQuestionSyncPayload.model_validate(raw_payload)
    except (json.JSONDecodeError, UnicodeDecodeError):
        message = (
            "Payload sync bukan JSON yang valid. Periksa Apps Script dan coba lagi."
        )
        _record_tiu_sync_status(db, "failed", attempt_time, message)
        raise HTTPException(status_code=422, detail=message)
    except ValidationError as exc:
        # Do not echo submitted answer keys or the full payload in admin errors.
        errors = getattr(exc, "errors", None)
        if not callable(errors):
            raise
        details = errors()
        message = (
            "; ".join(
                f"{'.'.join(str(part) for part in item.get('loc', []))}: {item.get('msg', 'tidak valid')}"
                for item in details[:8]
            )
            or "Payload soal tidak valid."
        )
        _record_tiu_sync_status(db, "failed", attempt_time, message)
        raise HTTPException(status_code=422, detail=message)
    except ValueError as exc:
        message = str(exc) or "Data soal tidak valid. Periksa format sinkronisasi."
        _record_tiu_sync_status(db, "failed", attempt_time, message)
        raise HTTPException(status_code=422, detail=message)

    package = {
        "source_form_id": payload.source_form_id,
        "synced_at": attempt_time,
        "questions": [question.model_dump() for question in payload.questions],
    }
    try:
        now = datetime.now(WIB).replace(tzinfo=None)
        _upsert_site_setting(
            db,
            "ppdb_tiu_question_package",
            json.dumps(package, ensure_ascii=False, separators=(",", ":")),
            now,
        )
        _upsert_site_setting(
            db,
            "ppdb_tiu_sync_question_count",
            str(len(payload.questions)),
            now,
        )
        _record_tiu_sync_status(db, "success", attempt_time)
    except Exception:
        db.rollback()
        logger.exception(
            "Penyimpanan paket soal TIU gagal; paket valid sebelumnya dipertahankan"
        )
        message = "Paket soal gagal disimpan. Paket valid sebelumnya tetap digunakan."
        _record_tiu_sync_status(db, "failed", attempt_time, message)
        raise HTTPException(status_code=500, detail=message)
    return {
        "status": "success",
        "source_form_id": payload.source_form_id,
        "question_count": len(payload.questions),
        "synced_at": attempt_time,
    }


@router.get("/document-settings")
def get_document_settings(
    user: dict = Depends(require_ppdb_read), db: Session = Depends(get_db)
):
    keys = (
        "ppdb_loa_template",
        "ppdb_loa_template_draft",
        "ppdb_loa_template_published_at",
        "ppdb_skd_background_url",
    )
    rows = db.query(SiteSetting).filter(SiteSetting.key.in_(keys)).all()
    values = {row.key: row.value or "" for row in rows}
    return {
        "loa_template": values.get("ppdb_loa_template", ""),
        "loa_draft_template": values.get("ppdb_loa_template_draft")
        or values.get("ppdb_loa_template", ""),
        "loa_is_published": bool(values.get("ppdb_loa_template", "").strip()),
        "loa_published_at": values.get("ppdb_loa_template_published_at", ""),
        "skd_background_url": values.get("ppdb_skd_background_url", ""),
    }


@router.put("/document-settings/loa-template")
def update_loa_template(
    body: dict[str, str],
    user: dict = Depends(require_ppdb_admin),
    db: Session = Depends(get_db),
):
    template = body.get("loa_template")
    if not isinstance(template, str) or len(template) > 30000:
        raise HTTPException(
            status_code=400,
            detail="Template LoA tidak valid (maksimal 30.000 karakter)",
        )
    now = datetime.now(WIB).replace(tzinfo=None)
    setting = db.get(SiteSetting, "ppdb_loa_template_draft")
    if setting:
        setting.value = template
        setting.updated_at = now
    else:
        db.add(
            SiteSetting(
                key="ppdb_loa_template_draft",
                value=template,
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()
    return {"loa_draft_template": template}


@router.post("/document-settings/loa-template/publish")
def publish_loa_template(
    user: dict = Depends(require_ppdb_admin),
    db: Session = Depends(get_db),
):
    draft = db.get(SiteSetting, "ppdb_loa_template_draft")
    if not draft or not draft.value or not draft.value.strip():
        raise HTTPException(
            status_code=400, detail="Simpan template LoA sebelum dipublikasikan"
        )
    now = datetime.now(WIB).replace(tzinfo=None)
    published = db.get(SiteSetting, "ppdb_loa_template")
    if published:
        published.value = draft.value
        published.updated_at = now
    else:
        db.add(
            SiteSetting(
                key="ppdb_loa_template",
                value=draft.value,
                created_at=now,
                updated_at=now,
            )
        )
    _upsert_site_setting(
        db,
        "ppdb_loa_template_published_at",
        now.isoformat(timespec="seconds"),
        now,
    )
    db.commit()
    return {
        "loa_template": draft.value,
        "published_at": now.isoformat(timespec="seconds"),
    }


@router.post("/document-settings/skd-background")
async def upload_skd_background(
    file: UploadFile = File(...),
    user: dict = Depends(require_ppdb_admin),
    db: Session = Depends(get_db),
):
    file_id = str(uuid.uuid4())
    uploaded = await upload_file(file, file_id)
    if not uploaded.mime_type.startswith("image/"):
        delete_upload(uploaded.storage_path)
        raise HTTPException(
            status_code=400, detail="Background SKD harus berupa gambar"
        )

    now = datetime.now(WIB).replace(tzinfo=None)
    setting = db.get(SiteSetting, "ppdb_skd_background_url")
    previous_url = setting.value if setting else None
    if setting:
        setting.value = uploaded.public_url
        setting.updated_at = now
    else:
        db.add(
            SiteSetting(
                key="ppdb_skd_background_url",
                value=uploaded.public_url,
                created_at=now,
                updated_at=now,
            )
        )
    db.add(
        FileUpload(
            id=file_id,
            uploaded_by=user["id"],
            original_name=uploaded.original_name,
            stored_name=uploaded.storage_path.rsplit("/", 1)[-1],
            mime_type=uploaded.mime_type,
            size_bytes=uploaded.size_bytes,
            storage_path=uploaded.storage_path,
            public_url=uploaded.public_url,
            entity_type="ppdb_configuration",
            entity_id="skd_background",
            data=uploaded.data,
            created_at=now,
        )
    )
    db.commit()

    if previous_url and previous_url.startswith("/uploads/"):
        previous_id = previous_url.rsplit("/", 1)[-1]
        previous = db.get(FileUpload, previous_id)
        if (
            previous
            and previous.entity_type == "ppdb_configuration"
            and previous.entity_id == "skd_background"
        ):
            db.delete(previous)
            db.commit()
            delete_upload(previous.storage_path)
    return {"skd_background_url": uploaded.public_url}


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


@router.put("/waves/{id}/mou-template")
def update_wave_mou_template(
    id: str,
    body: WaveMouTemplateUpdate,
    user: dict = Depends(require_ppdb_admin),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.update_wave_mou_template(id, body)


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


# Rute /applicants/me/* didaftarkan SEBELUM /applicants/{id} agar "me"
# tidak ditangkap sebagai id.
@router.get("/applicants/me/mou")
def get_my_mou(
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_my_mou(user["id"])


@router.post("/applicants/me/mou/sign")
def sign_my_mou(
    body: MouSignRequest,
    user: dict[str, Any] = Depends(get_current_user),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.sign_my_mou(user["id"], body)


@router.get("/applicants/{id}/mou")
def get_applicant_mou(
    id: str,
    user: dict = Depends(require_ppdb_read),
    service: PPDBService = Depends(get_ppdb_service),
):
    return service.get_applicant_mou(id)


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
