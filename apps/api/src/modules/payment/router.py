import hashlib
import hmac

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session

from src.core.config import settings
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


def _verify_midtrans_signature(
    payload: dict, signature_key: str | None, server_key: str | None
) -> None:
    """
    Verifikasi signature Midtrans (SHA512) untuk mencegah webhook falsifikasi.
    http://docs.midtrans.com/en/technical-reference/encryption
    signature_key = sha512(order_id + status_code + gross_amount + ServerKey)
    """
    if not server_key:
        raise HTTPException(
            status_code=401,
            detail="Payment webhook not enabled: MIDTRANS_SERVER_KEY not configured",
        )

    order_id = payload.get("order_id")
    status_code = payload.get("status_code")
    gross_amount = payload.get("gross_amount")

    if not order_id or status_code is None or gross_amount is None:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    raw = f"{order_id}{status_code}{gross_amount}{server_key}"
    computed = hashlib.sha512(raw.encode("utf-8")).hexdigest()

    if not signature_key or not hmac.compare_digest(computed, signature_key):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    service: PaymentService = Depends(get_payment_service),
):
    """
    Webhook for Payment Gateway (e.g., Midtrans).
    Verifikasi signature Midtrans (sha512) wajib; menolak jika `MIDTRANS_SERVER_KEY`
    tidak dikonfigurasi (fail-closed) supaya tidak bisa di-forge.
    Catatan: Midtrans mengirim `signature_key` di BODY JSON, bukan header.
    """
    payload = await request.json()
    signature_key = payload.get("signature_key")
    _verify_midtrans_signature(payload, signature_key, settings.midtrans_server_key)
    return service.process_webhook(payload)


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
