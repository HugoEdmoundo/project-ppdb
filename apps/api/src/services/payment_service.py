import math
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.models.ppdb import PPDBBMOU, PPDBApplicantDiscount, PPDBStage2Bill
from src.repositories.payment_repository import PaymentRepository

WIB = ZoneInfo("Asia/Jakarta")


class PaymentService:
    def __init__(self, repo: PaymentRepository):
        self.repo = repo

    def get_transactions(self, page: int, per_page: int, status: str | None) -> dict:
        offset = (page - 1) * per_page
        active_wave = self.repo.get_active_wave_info()
        if not active_wave:
            return {"data": [], "total": 0, "active_wave": None}

        data, total = self.repo.get_transactions(
            active_wave["id"], status, per_page, offset
        )
        return {"data": data, "total": total, "active_wave": active_wave}

    def get_my_transaction(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant record not found")

        transaction = self.repo.get_latest_transaction_by_applicant_id(applicant.id)

        app_dict = {
            "id": applicant.id,
            "wave_id": applicant.wave_id,
            "user_id": applicant.user_id,
            "full_name": applicant.full_name,
            "email": applicant.email,
            "phone": applicant.phone,
            "status": applicant.status,
            "payment_status": applicant.payment_status,
        }

        tx_dict = None
        if transaction:
            tx_dict = {
                "id": transaction.id,
                "amount": transaction.amount,
                "status": transaction.status,
                "created_at": transaction.created_at,
                "method": transaction.method,
                "proof_url": transaction.proof_url,
            }
        return {"applicant": app_dict, "transaction": tx_dict}

    def confirm_payment(self, transaction_id: str, admin_user_id: str) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if tx.status == "success":
            raise HTTPException(status_code=400, detail="Transaction already confirmed")

        now_wib = datetime.now(WIB)
        tx.status = "success"
        tx.confirmed_by = admin_user_id
        tx.confirmed_at = now_wib
        self.repo.update_transaction(tx)

        applicant = self.repo.get_applicant_by_id(tx.applicant_id)
        if applicant:
            applicant.payment_status = "paid"
            applicant.status = "document_uploaded_pending"
            self.repo.update_applicant(applicant)

            # notification
            try:
                from src.core.notif_service import send_notification

                send_notification(
                    "payment_success", applicant.user_id, {"nominal_bayar": tx.amount}
                )
            except Exception:
                import logging

                logging.getLogger("ptdarrahman.payment").exception(
                    "Failed to send payment_success notification for tx %s",
                    transaction_id,
                )

        return {"success": True, "message": "Payment confirmed successfully"}

    def cancel_confirm_payment(self, transaction_id: str) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if tx.status != "success":
            raise HTTPException(
                status_code=400, detail="Only successful transactions can be cancelled"
            )

        if tx.method != "offline":
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel confirmation for online payment transactions",
            )

        tx.status = "pending"
        tx.confirmed_by = None
        tx.confirmed_at = None
        self.repo.update_transaction(tx)

        applicant = self.repo.get_applicant_by_id(tx.applicant_id)
        if applicant:
            applicant.payment_status = "pending"
            applicant.status = "pending_payment"
            self.repo.update_applicant(applicant)

        return {
            "success": True,
            "message": "Payment confirmation cancelled successfully",
        }

    def process_webhook(self, payload: dict) -> dict:
        order_id = payload.get("order_id")
        if not isinstance(order_id, str) or not order_id:
            return {"status": "ignored", "message": "Missing order_id"}
        transaction_status = payload.get("transaction_status")
        fraud_status = payload.get("fraud_status")

        tx = self.repo.get_transaction_by_id(order_id)
        if not tx:
            return {"status": "ignored", "message": "Transaction not found"}

        if tx.status == "success":
            return {"status": "ignored", "message": "Already success"}

        new_status = tx.status
        if transaction_status == "capture":
            if fraud_status == "challenge":
                new_status = "pending"
            elif fraud_status == "accept":
                new_status = "success"
        elif transaction_status == "settlement":
            new_status = "success"
        elif transaction_status in ["cancel", "deny", "expire"]:
            new_status = "expired" if transaction_status == "expire" else "failed"
        elif transaction_status == "pending":
            new_status = "pending"

        if new_status == tx.status:
            return {"status": "ignored"}

        tx.status = new_status
        self.repo.update_transaction(tx)

        applicant = self.repo.get_applicant_by_id(tx.applicant_id)
        if applicant:
            if new_status == "success":
                applicant.payment_status = "paid"
                applicant.status = "document_uploaded_pending"
            elif new_status in ["failed", "expired"]:
                applicant.payment_status = new_status
            self.repo.update_applicant(applicant)

            try:
                from src.core.notif_service import send_notification

                if new_status == "success":
                    send_notification(
                        "payment_success",
                        applicant.user_id,
                        {"nominal_bayar": tx.amount},
                    )
                elif new_status == "failed":
                    send_notification(
                        "payment_failed",
                        applicant.user_id,
                        {
                            "alasan_kegagalan": "Pembayaran ditolak atau dibatalkan"
                            " dari sistem."
                        },
                    )
                elif new_status == "expired":
                    send_notification("payment_expired", applicant.user_id, {})
            except Exception:
                import logging

                logging.getLogger("ptdarrahman.payment").exception(
                    "Failed to send notification for webhook tx %s", order_id
                )

        return {"status": "ok"}

    def get_stage2_applicants(self) -> dict:
        active_wave = self.repo.get_active_wave_info()
        if not active_wave:
            return {"data": [], "total": 0, "active_wave": None}

        data, total = self.repo.get_stage2_applicants(active_wave["id"])
        return {"data": data, "total": total, "active_wave": active_wave}

    def get_applicant_discounts(self, applicant_id: str) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        fee_items = self.repo.get_wave_fee_items_with_discounts(
            applicant.id, applicant.wave_id
        )
        mou = self.repo.get_mou_by_applicant_id(applicant.id)

        return {
            "applicant": {
                "id": applicant.id,
                "full_name": applicant.full_name,
                "wave_id": applicant.wave_id,
            },
            "fee_items": fee_items,
            "mou": {"status": mou.status, "signed_at": mou.signed_at} if mou else None,
        }

    def save_applicant_discounts(self, applicant_id: str, items: list[dict]) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        saved = 0
        generated = 0
        now_wib = datetime.now(WIB)

        # Pra-validasi SEMUA item dulu agar 400 terjadi sebelum ada tulisan.
        prepared: list[dict] = []
        for item in items:
            fee_item_id = item.get("fee_item_id")
            if not isinstance(fee_item_id, str):
                continue
            fi = self.repo.get_fee_item_by_id(fee_item_id)
            if not fi or fi.wave_id != applicant.wave_id:
                continue
            if self.repo.has_paid_stage2_bills(applicant_id, fee_item_id):
                raise HTTPException(
                    status_code=400,
                    detail="Ada tagihan lunas; diskon item ini tidak bisa diubah",
                )
            prepared.append(
                {
                    "fee_item_id": fee_item_id,
                    "nominal": fi.nominal,
                    "item": item,
                }
            )

        for entry in prepared:
            fee_item_id = entry["fee_item_id"]
            nominal = entry["nominal"]
            item = entry["item"]
            dtype = item.get("discount_type")
            dvalue = item.get("discount_value")
            try:
                icount = int(item.get("installment_count") or 0)
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400, detail="Jumlah cicilan tidak valid"
                ) from exc
            if icount < 0:
                raise HTTPException(
                    status_code=400, detail="Jumlah cicilan tidak boleh negatif"
                )

            if dtype not in (None, "", "percent", "nominal"):
                raise HTTPException(status_code=400, detail="Tipe diskon tidak valid")
            try:
                dnum = float(dvalue or 0)
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400, detail="Nilai diskon tidak valid"
                ) from exc
            if dnum < 0:
                raise HTTPException(
                    status_code=400, detail="Nilai diskon tidak boleh negatif"
                )

            nominal = int(nominal)
            discount_amount = 0
            if dtype == "percent" and dnum:
                # Clamp agar tidak melebihi nominal (mencegah tagihan negatif).
                discount_amount = min(math.floor(nominal * dnum / 100), nominal)
            elif dtype == "nominal" and dnum:
                discount_amount = min(int(dnum), nominal)

            final_amount = nominal - discount_amount

            existing_d = self.repo.get_applicant_discount(applicant_id, fee_item_id)
            if existing_d:
                existing_d.discount_type = dtype
                existing_d.discount_value = dvalue
                existing_d.installment_count = icount
                existing_d.discount_amount = discount_amount
                existing_d.final_amount = final_amount
                self.repo.save_applicant_discount(existing_d)
            else:
                new_d = PPDBApplicantDiscount(
                    id=str(uuid.uuid4()),
                    applicant_id=applicant_id,
                    fee_item_id=fee_item_id,
                    discount_type=dtype,
                    discount_value=dvalue,
                    discount_amount=discount_amount,
                    final_amount=final_amount,
                    installment_count=icount,
                    created_at=now_wib,
                    updated_at=now_wib,
                )
                self.repo.save_applicant_discount(new_d)
            saved += 1

            # Generate bills (tagihan lunas sudah dicek di pra-validasi).
            self.repo.delete_stage2_bills(applicant_id, fee_item_id)

            if icount == 0:
                bill = PPDBStage2Bill(
                    id=str(uuid.uuid4()),
                    applicant_id=applicant_id,
                    fee_item_id=fee_item_id,
                    installment_number=0,
                    amount=final_amount,
                    status="pending",
                    created_at=now_wib,
                    updated_at=now_wib,
                )
                self.repo.save_stage2_bill(bill)
                generated += 1
            elif icount > 0:
                amt_per_inst = math.ceil(final_amount / icount)
                for i in range(1, icount + 1):
                    if i == icount:
                        amt = final_amount - (amt_per_inst * (icount - 1))
                    else:
                        amt = amt_per_inst

                    bill = PPDBStage2Bill(
                        id=str(uuid.uuid4()),
                        applicant_id=applicant_id,
                        fee_item_id=fee_item_id,
                        installment_number=i,
                        amount=amt,
                        status="pending",
                        created_at=now_wib,
                        updated_at=now_wib,
                    )
                    self.repo.save_stage2_bill(bill)
                    generated += 1

        # Auto-generate MOU
        self._auto_generate_mou(applicant)

        return {"success": True, "discounts_saved": saved, "bills_generated": generated}

    def _auto_generate_mou(self, applicant):
        wave = self.repo.get_wave_by_id(applicant.wave_id)
        if not wave or not hasattr(wave, "mou_template") or not wave.mou_template:
            return

        template = str(wave.mou_template)
        now_wib = datetime.now(WIB)
        replacements = {
            "{nama_peserta}": applicant.full_name or "",
            "{nisn}": applicant.nisn or "",
            "{nik}": applicant.nik or "",
            "{asal_sekolah}": applicant.previous_school or "",
            "{alamat}": applicant.address or "",
            "{nama_ortu}": applicant.parent_name or "",
            "{email}": applicant.email or "",
            "{nomor_wa}": applicant.phone or "",
            "{jalur}": applicant.registration_path or "",
            "{jenjang}": applicant.registration_level or "",
            "{tanggal}": now_wib.strftime("%d %B %Y"),
        }
        for k, v in replacements.items():
            template = template.replace(k, v)

        existing_mou = self.repo.get_mou_by_applicant_id(applicant.id)
        if existing_mou:
            # Jangan timpa MOU yang sudah ditandatangani.
            if existing_mou.status == "signed":
                return
            existing_mou.draft_content = template
            existing_mou.updated_at = now_wib
            self.repo.save_mou(existing_mou)
        else:
            new_mou = PPDBBMOU(
                id=str(uuid.uuid4()),
                applicant_id=applicant.id,
                draft_content=template,
                status="draft",
                created_at=now_wib,
                updated_at=now_wib,
            )
            self.repo.save_mou(new_mou)

    def get_stage2_bills(
        self, applicant_id: str | None, status: str | None, page: int, per_page: int
    ) -> dict:
        offset = (page - 1) * per_page
        active_wave = self.repo.get_active_wave_info()
        if not active_wave:
            return {"data": [], "total": 0, "active_wave": None}

        data, total = self.repo.get_stage2_bills(
            active_wave["id"], applicant_id, status, per_page, offset
        )
        return {"data": data, "total": total, "active_wave": active_wave}

    def get_my_stage2_bills(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        bills = self.repo.get_my_stage2_bills(applicant.id)
        mou = self.repo.get_mou_by_applicant_id(applicant.id)
        mou_signed = mou.status == "signed" if mou else False

        return {"bills": bills, "mou_signed": mou_signed}

    def confirm_stage2_bill(self, bill_id: str, admin_user_id: str) -> dict:
        bill = self.repo.get_stage2_bill_by_id(bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.status != "pending":
            raise HTTPException(
                status_code=400,
                detail="Hanya dapat mengonfirmasi tagihan berstatus pending",
            )

        now_wib = datetime.now(WIB)
        bill.status = "paid"
        bill.confirmed_by = admin_user_id
        bill.confirmed_at = now_wib
        self.repo.update_stage2_bill(bill)

        return {"success": True}

    def cancel_stage2_bill(self, bill_id: str) -> dict:
        bill = self.repo.get_stage2_bill_by_id(bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.status != "paid":
            raise HTTPException(
                status_code=400, detail="Hanya dapat membatalkan tagihan berstatus paid"
            )

        bill.status = "pending"
        bill.confirmed_by = None
        bill.confirmed_at = None
        bill.proof_url = None
        self.repo.update_stage2_bill(bill)

        return {"success": True}

    def upload_stage2_proof(self, bill_id: str, user_id: str, proof_url: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        bill = self.repo.get_stage2_bill_by_id(bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        if bill.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not your bill")
        if bill.status != "pending":
            raise HTTPException(
                status_code=400, detail="Hanya dapat upload bukti untuk tagihan pending"
            )

        bill.proof_url = proof_url
        self.repo.update_stage2_bill(bill)

        return {"success": True, "proof_url": proof_url}
