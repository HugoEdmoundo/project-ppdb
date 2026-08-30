from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.core.uploads import upload_file

from src.repositories.payment_repository import PaymentRepository
from src.services.payment_service import PaymentService

router = APIRouter()

def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    repo = PaymentRepository(db)
    return PaymentService(repo)

def require_payment_admin(user: dict = Depends(get_current_user)):
    if user.get("is_superadmin"):
        return user
    
    perms = user.get("permissions", {})
    if perms.get("payment") not in ["crud"]:
        raise HTTPException(status_code=403, detail="Forbidden: Requires payment CRUD access")
    return user

def require_payment_read(user: dict = Depends(get_current_user)):
    if user.get("is_superadmin"):
        return user
    
    perms = user.get("permissions", {})
    if perms.get("payment") not in ["read", "crud"]:
        raise HTTPException(status_code=403, detail="Forbidden: Requires payment read access")
    return user


@router.get("/transactions")
def get_transactions(
    page: int = Query(1),
    perPage: int = Query(20),
    status: Optional[str] = Query(None),
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_transactions(page, perPage, status)


@router.get("/my-transaction")
def get_my_transaction(
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_my_transaction(user["id"])


@router.put("/transactions/{id}/confirm")
def confirm_payment(
    id: str, 
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service)
):
    return service.confirm_payment(id, user["id"])


@router.put("/transactions/{id}/cancel-confirm")
def cancel_confirm_payment(
    id: str, 
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service)
):
    return service.cancel_confirm_payment(id)


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    service: PaymentService = Depends(get_payment_service)
):
    """
    Webhook for Payment Gateway (e.g., Midtrans)
    """
    payload = await request.json()
    return service.process_webhook(payload)


# ─── Stage 2 — Diskonasi (per peserta lulus) ─────────────────────────────────

@router.get("/stage2/applicants")
def get_stage2_applicants(
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_stage2_applicants()


@router.get("/stage2/{applicant_id}/discounts")
def get_applicant_discounts(
    applicant_id: str, 
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_applicant_discounts(applicant_id)


@router.post("/stage2/{applicant_id}/discounts")
async def save_applicant_discounts(
    request: Request, 
    applicant_id: str, 
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service)
):
    body = await request.json()
    items = body.get("items", [])
    return service.save_applicant_discounts(applicant_id, items)


# ─── Stage 2 — Tagihan ────────────────────────────────────────────────────────

@router.get("/stage2/bills")
def get_stage2_bills(
    applicant_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1),
    perPage: int = Query(20),
    user: dict = Depends(require_payment_read),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_stage2_bills(applicant_id, status, page, perPage)


@router.get("/stage2/my-bills")
def get_my_stage2_bills(
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    return service.get_my_stage2_bills(user["id"])


@router.put("/stage2/bills/{bill_id}/confirm")
def confirm_stage2_bill(
    bill_id: str, 
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service)
):
    return service.confirm_stage2_bill(bill_id, user["id"])


@router.put("/stage2/bills/{bill_id}/cancel")
def cancel_stage2_bill(
    bill_id: str, 
    user: dict = Depends(require_payment_admin),
    service: PaymentService = Depends(get_payment_service)
):
    return service.cancel_stage2_bill(bill_id)


@router.post("/stage2/bills/{bill_id}/upload-proof")
async def upload_stage2_proof(
    bill_id: str, 
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    result = await upload_file(file)
    return service.upload_stage2_proof(bill_id, user["id"], result.public_url)
