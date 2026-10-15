from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import (
    AccessLevel,
    get_current_user,
    require_module_access,
)
from src.core.uploads import upload_file
from src.repositories.payment_repository import PaymentRepository
from src.services.payment_service import PaymentService

router = APIRouter()


def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    repo = PaymentRepository(db)
    return PaymentService(repo)


# Konsisten dengan modul lain: hormati superadmin, role is_superadmin,
# override per-user, dan permission role.
require_payment_admin = require_module_access("ppdb", AccessLevel.CRUD)
require_payment_read = require_module_access("ppdb", AccessLevel.READ)


@router.get("/transactions")
def get_transactions(
    page: int = Query(1),
    perPage: int = Query(20),
    status: str | None = Query(None),
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_transactions(page, perPage, status)


class CreateQRISPayload(BaseModel):
    payment_type: str
    amount: int | None = None


@router.post("/create-qris")
def create_qris(
    payload: CreateQRISPayload,
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.create_qris_transaction(
        user["id"], payload.payment_type, payload.amount
    )


@router.get("/active-transaction")
def get_active_transaction(
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_active_transaction(user["id"])


@router.post("/transactions/{id}/sync-status")
def sync_transaction_status(
    id: str,
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.sync_transaction_status(id, user["id"])


@router.post("/transactions/{id}/cancel")
def cancel_transaction(
    id: str,
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.cancel_transaction(id, user["id"])


@router.get("/receipt/{id}")
def get_receipt(
    id: str,
    token: str | None = Query(None),
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_receipt(id, token=token, user_id=user["id"])


@router.get("/public-receipt/{id}")
def get_public_receipt(
    id: str,
    token: str | None = Query(None),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_public_receipt(id)


@router.get("/my-transaction")
def get_my_transaction(
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_my_transaction(user["id"])


@router.put("/transactions/{id}/confirm")
def confirm_payment(
    id: str,
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service),
):
    return service.confirm_payment(id, user["id"])


@router.put("/transactions/{id}/cancel-confirm")
def cancel_confirm_payment(
    id: str,
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service),
):
    return service.cancel_confirm_payment(id)


@router.get("/stage2/monitoring")
def get_stage2_monitoring(
    wave_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_stage2_monitoring(
        wave_id=wave_id,
        status_filter=status,
        search=search,
        page=page,
        per_page=perPage,
    )


@router.get("/applicants/{applicant_id}/transactions")
def get_applicant_transactions(
    applicant_id: str,
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_applicant_transactions(applicant_id)


async def _read_json_body(request: Request) -> dict:
    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail="Body webhook bukan JSON yang valid"
        ) from exc
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=400, detail="Body webhook harus berupa objek JSON"
        )
    return payload


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Webhook pembayaran formulir & PPDB (Pakasir QRIS / Gateway).
    """
    payload = await _read_json_body(request)
    x_secret = request.headers.get("X-Secret")
    return service.process_pakkasir_webhook(payload, x_secret=x_secret)


@router.post("/webhook/pak-kasir")
async def pakkasir_webhook(
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Webhook resmi 1 Pintu QRIS Pakasir untuk verifikasi pembayaran real-time.
    """
    payload = await _read_json_body(request)
    x_secret = request.headers.get("X-Secret")
    return service.process_pakkasir_webhook(payload, x_secret=x_secret)


# ─── Stage 2 — Diskonasi (per peserta lulus) ─────────────────────────────────


@router.get("/stage2/applicants")
def get_stage2_applicants(
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_stage2_applicants()


@router.get("/stage2/{applicant_id}/discounts")
def get_applicant_discounts(
    applicant_id: str,
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_applicant_discounts(applicant_id)


@router.post("/stage2/{applicant_id}/discounts")
async def save_applicant_discounts(
    request: Request,
    applicant_id: str,
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service),
):
    body = await request.json()
    items = body.get("items", [])
    return service.save_applicant_discounts(applicant_id, items)


# ─── Stage 2 — Tagihan ────────────────────────────────────────────────────────


@router.get("/stage2/bills")
def get_stage2_bills(
    applicant_id: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_stage2_bills(applicant_id, status, page, perPage)


@router.get("/stage2/my-bills")
def get_my_stage2_bills(
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.get_my_stage2_bills(user["id"])


@router.put("/stage2/bills/{bill_id}/confirm")
def confirm_stage2_bill(
    bill_id: str,
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service),
):
    return service.confirm_stage2_bill(bill_id, user["id"])


@router.put("/stage2/bills/{bill_id}/cancel")
def cancel_stage2_bill(
    bill_id: str,
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service),
):
    return service.cancel_stage2_bill(bill_id)


@router.post("/stage2/bills/{bill_id}/upload-proof")
async def upload_stage2_proof(
    bill_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    result = await upload_file(file)
    return service.upload_stage2_proof(bill_id, user["id"], result.public_url)


class InstallmentPlanPayload(BaseModel):
    installment_count: int


@router.post("/stage2/my-installment-plan")
def set_my_installment_plan(
    payload: InstallmentPlanPayload,
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    return service.configure_my_installment_plan(user["id"], payload.installment_count)


@router.post("/stage2/my-bills/upload-proof-batch")
async def upload_stage2_proof_batch(
    bill_ids: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
):
    import json

    try:
        parsed_ids = (
            json.loads(bill_ids)
            if bill_ids.startswith("[")
            else [b.strip() for b in bill_ids.split(",") if b.strip()]
        )
    except Exception:
        parsed_ids = [b.strip() for b in bill_ids.split(",") if b.strip()]

    result = await upload_file(file)
    return service.upload_stage2_proof_batch(parsed_ids, user["id"], result.public_url)
