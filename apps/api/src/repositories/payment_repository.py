from datetime import datetime
from typing import Any, cast
from zoneinfo import ZoneInfo

from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import Session

from src.models.ppdb import (
    PPDBBMOU,
    PPDBApplicant,
    PPDBApplicantDiscount,
    PPDBPaymentTransaction,
    PPDBStage2Bill,
    PPDBWave,
    PPDBWaveFeeItem,
)
from src.models.selection import SelectionResult

WIB = ZoneInfo("Asia/Jakarta")


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_wave_id(self) -> str | None:
        stmt = select(PPDBWave.id).where(PPDBWave.status == "active").limit(1)
        return cast(str | None, self.db.scalars(stmt).first())

    def get_active_wave_info(self) -> dict[str, str] | None:
        stmt = select(PPDBWave).where(PPDBWave.status == "active").limit(1)
        wave = self.db.scalars(stmt).first()
        return {"id": wave.id, "name": wave.name} if wave else None

    def get_transactions(
        self, wave_id: str, status: str | None, limit: int, offset: int
    ) -> tuple[list[Any], int]:
        stmt = (
            select(
                PPDBPaymentTransaction,
                PPDBApplicant.full_name.label("applicant_name"),
                PPDBApplicant.email.label("applicant_email"),
            )
            .join(
                PPDBApplicant, PPDBPaymentTransaction.applicant_id == PPDBApplicant.id
            )
            .where(PPDBApplicant.wave_id == wave_id)
        )

        count_stmt = (
            select(func.count())
            .select_from(PPDBPaymentTransaction)
            .join(
                PPDBApplicant, PPDBPaymentTransaction.applicant_id == PPDBApplicant.id
            )
            .where(PPDBApplicant.wave_id == wave_id)
        )

        if status:
            stmt = stmt.where(PPDBPaymentTransaction.status == status)
            count_stmt = count_stmt.where(PPDBPaymentTransaction.status == status)

        stmt = (
            stmt.order_by(PPDBPaymentTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        total = self.db.scalar(count_stmt) or 0
        rows = self.db.execute(stmt).all()

        result = []
        for r in rows:
            tx = r.PPDBPaymentTransaction
            tx_dict = {
                "id": tx.id,
                "applicant_id": tx.applicant_id,
                "method": tx.method,
                "amount": tx.amount,
                "status": tx.status,
                "external_id": tx.external_id,
                "gateway_payload": tx.gateway_payload,
                "failure_reason": tx.failure_reason,
                "proof_url": tx.proof_url,
                "confirmed_by": tx.confirmed_by,
                "confirmed_at": tx.confirmed_at,
                "notes": tx.notes,
                "created_at": tx.created_at,
                "updated_at": tx.updated_at,
                "applicant_name": r.applicant_name,
                "applicant_email": r.applicant_email,
            }
            result.append(tx_dict)

        return result, total

    def get_applicant_by_user_id(self, user_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.user_id == user_id)
        return cast(PPDBApplicant | None, self.db.scalars(stmt).first())

    def get_latest_transaction_by_applicant_id(
        self, applicant_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = (
            select(PPDBPaymentTransaction)
            .where(PPDBPaymentTransaction.applicant_id == applicant_id)
            .order_by(PPDBPaymentTransaction.created_at.desc())
            .limit(1)
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def get_transaction_by_id(
        self, transaction_id: str
    ) -> PPDBPaymentTransaction | None:
        stmt = select(PPDBPaymentTransaction).where(
            PPDBPaymentTransaction.id == transaction_id
        )
        return cast(PPDBPaymentTransaction | None, self.db.scalars(stmt).first())

    def update_transaction(self, transaction: PPDBPaymentTransaction):
        transaction.updated_at = datetime.now(WIB)
        self.db.add(transaction)
        self.db.flush()
        self.db.commit()

    def update_applicant(self, applicant: PPDBApplicant):
        applicant.updated_at = datetime.now(WIB)
        self.db.add(applicant)
        self.db.flush()
        self.db.commit()

    def get_applicant_by_id(self, applicant_id: str) -> PPDBApplicant | None:
        stmt = select(PPDBApplicant).where(PPDBApplicant.id == applicant_id)
        return cast(PPDBApplicant | None, self.db.scalars(stmt).first())

    # Stage 2
    def get_stage2_applicants(self, wave_id: str) -> tuple[list[Any], int]:
        stmt = (
            select(PPDBApplicant)
            .join(SelectionResult, SelectionResult.applicant_id == PPDBApplicant.id)
            .where(
                SelectionResult.graduation_status == "passed",
                PPDBApplicant.wave_id == wave_id,
                PPDBApplicant.deleted_at.is_(None),
            )
        )

        applicants = self.db.scalars(stmt).all()
        results = []
        for app in applicants:
            has_discount = (
                self.db.scalar(
                    select(PPDBApplicantDiscount.id)
                    .where(PPDBApplicantDiscount.applicant_id == app.id)
                    .limit(1)
                )
                is not None
            )

            bills = self.db.scalars(
                select(PPDBStage2Bill).where(PPDBStage2Bill.applicant_id == app.id)
            ).all()

            mou = self.db.scalar(
                select(PPDBBMOU.status).where(PPDBBMOU.applicant_id == app.id).limit(1)
            )

            app_dict = {
                "id": app.id,
                "full_name": app.full_name,
                "nisn": app.nisn,
                "email": app.email,
                "phone": app.phone,
                "registration_level": app.registration_level,
                "registration_path": app.registration_path,
                "discount_configured": has_discount,
                "bills_generated": len(bills) > 0,
                "total_bills": len(bills),
                "total_paid_bills": sum(1 for b in bills if b.status == "paid"),
                "mou_status": mou,
            }
            results.append(app_dict)

        return results, len(results)

    def get_wave_fee_items_with_discounts(
        self, applicant_id: str, wave_id: str
    ) -> list[dict]:
        stmt = (
            select(PPDBWaveFeeItem, PPDBApplicantDiscount)
            .outerjoin(
                PPDBApplicantDiscount,
                and_(
                    PPDBApplicantDiscount.fee_item_id == PPDBWaveFeeItem.id,
                    PPDBApplicantDiscount.applicant_id == applicant_id,
                ),
            )
            .where(PPDBWaveFeeItem.wave_id == wave_id)
            .order_by(PPDBWaveFeeItem.order_index.asc())
        )

        rows = self.db.execute(stmt).all()
        items = []
        for r in rows:
            fi = r.PPDBWaveFeeItem
            d = r.PPDBApplicantDiscount

            i_dict = {
                "id": fi.id,
                "wave_id": fi.wave_id,
                "name": fi.name,
                "nominal": fi.nominal,
                "order_index": fi.order_index,
                "created_at": fi.created_at,
                "updated_at": fi.updated_at,
                "discount": None,
            }
            if d and d.discount_type:
                i_dict["discount"] = {
                    "discount_type": d.discount_type,
                    "discount_value": d.discount_value,
                    "installment_count": d.installment_count,
                }
            items.append(i_dict)
        return items

    def get_mou_by_applicant_id(self, applicant_id: str) -> PPDBBMOU | None:
        stmt = select(PPDBBMOU).where(PPDBBMOU.applicant_id == applicant_id)
        return cast(PPDBBMOU | None, self.db.scalars(stmt).first())

    def get_fee_item_by_id(self, fee_item_id: str) -> PPDBWaveFeeItem | None:
        stmt = select(PPDBWaveFeeItem).where(PPDBWaveFeeItem.id == fee_item_id)
        return cast(PPDBWaveFeeItem | None, self.db.scalars(stmt).first())

    def get_applicant_discount(
        self, applicant_id: str, fee_item_id: str
    ) -> PPDBApplicantDiscount | None:
        stmt = select(PPDBApplicantDiscount).where(
            PPDBApplicantDiscount.applicant_id == applicant_id,
            PPDBApplicantDiscount.fee_item_id == fee_item_id,
        )
        return cast(PPDBApplicantDiscount | None, self.db.scalars(stmt).first())

    def save_applicant_discount(self, discount: PPDBApplicantDiscount):
        self.db.add(discount)
        self.db.flush()
        self.db.commit()

    def has_paid_stage2_bills(self, applicant_id: str, fee_item_id: str) -> bool:
        stmt = select(PPDBStage2Bill.id).where(
            PPDBStage2Bill.applicant_id == applicant_id,
            PPDBStage2Bill.fee_item_id == fee_item_id,
            PPDBStage2Bill.status == "paid",
        )
        return self.db.scalars(stmt).first() is not None

    def delete_stage2_bills(self, applicant_id: str, fee_item_id: str):
        stmt = delete(PPDBStage2Bill).where(
            PPDBStage2Bill.applicant_id == applicant_id,
            PPDBStage2Bill.fee_item_id == fee_item_id,
        )
        self.db.execute(stmt)
        self.db.flush()
        self.db.commit()

    def save_stage2_bill(self, bill: PPDBStage2Bill):
        self.db.add(bill)
        self.db.flush()
        self.db.commit()

    def get_wave_by_id(self, wave_id: str) -> PPDBWave | None:
        stmt = select(PPDBWave).where(PPDBWave.id == wave_id)
        return cast(PPDBWave | None, self.db.scalars(stmt).first())

    def save_mou(self, mou: PPDBBMOU):
        self.db.add(mou)
        self.db.flush()
        self.db.commit()

    def get_stage2_bills(
        self,
        wave_id: str,
        applicant_id: str | None,
        status: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Any], int]:
        stmt = (
            select(
                PPDBStage2Bill,
                PPDBApplicant.full_name,
                PPDBWaveFeeItem.name.label("fee_item_name"),
            )
            .join(PPDBApplicant, PPDBStage2Bill.applicant_id == PPDBApplicant.id)
            .join(PPDBWaveFeeItem, PPDBStage2Bill.fee_item_id == PPDBWaveFeeItem.id)
            .where(PPDBApplicant.wave_id == wave_id)
        )

        count_stmt = (
            select(func.count())
            .select_from(PPDBStage2Bill)
            .join(PPDBApplicant, PPDBStage2Bill.applicant_id == PPDBApplicant.id)
            .where(PPDBApplicant.wave_id == wave_id)
        )

        if applicant_id:
            stmt = stmt.where(PPDBStage2Bill.applicant_id == applicant_id)
            count_stmt = count_stmt.where(PPDBStage2Bill.applicant_id == applicant_id)

        if status:
            stmt = stmt.where(PPDBStage2Bill.status == status)
            count_stmt = count_stmt.where(PPDBStage2Bill.status == status)

        stmt = (
            stmt.order_by(PPDBStage2Bill.created_at.desc()).limit(limit).offset(offset)
        )

        total = self.db.scalar(count_stmt) or 0
        rows = self.db.execute(stmt).all()

        results = []
        for r in rows:
            b = r.PPDBStage2Bill
            b_dict = {
                "id": b.id,
                "applicant_id": b.applicant_id,
                "fee_item_id": b.fee_item_id,
                "discount_id": b.discount_id,
                "installment_number": b.installment_number,
                "amount": b.amount,
                "due_date": b.due_date,
                "status": b.status,
                "proof_url": b.proof_url,
                "confirmed_by": b.confirmed_by,
                "confirmed_at": b.confirmed_at,
                "notes": b.notes,
                "created_at": b.created_at,
                "updated_at": b.updated_at,
                "full_name": r.full_name,
                "fee_item_name": r.fee_item_name,
            }
            results.append(b_dict)

        return results, total

    def get_my_stage2_bills(self, applicant_id: str) -> list[dict]:
        stmt = (
            select(
                PPDBStage2Bill,
                PPDBWaveFeeItem.name.label("fee_item_name"),
                PPDBWaveFeeItem.order_index,
            )
            .join(PPDBWaveFeeItem, PPDBStage2Bill.fee_item_id == PPDBWaveFeeItem.id)
            .where(PPDBStage2Bill.applicant_id == applicant_id)
            .order_by(
                PPDBWaveFeeItem.order_index.asc(),
                PPDBStage2Bill.installment_number.asc(),
            )
        )
        rows = self.db.execute(stmt).all()

        results = []
        for r in rows:
            b = r.PPDBStage2Bill
            b_dict = {
                "id": b.id,
                "applicant_id": b.applicant_id,
                "fee_item_id": b.fee_item_id,
                "discount_id": b.discount_id,
                "installment_number": b.installment_number,
                "amount": b.amount,
                "due_date": b.due_date,
                "status": b.status,
                "proof_url": b.proof_url,
                "confirmed_by": b.confirmed_by,
                "confirmed_at": b.confirmed_at,
                "notes": b.notes,
                "created_at": b.created_at,
                "updated_at": b.updated_at,
                "fee_item_name": r.fee_item_name,
                "order_index": r.order_index,
            }
            results.append(b_dict)

        return results

    def get_stage2_bill_by_id(self, bill_id: str) -> PPDBStage2Bill | None:
        stmt = select(PPDBStage2Bill).where(PPDBStage2Bill.id == bill_id)
        return cast(PPDBStage2Bill | None, self.db.scalars(stmt).first())

    def update_stage2_bill(self, bill: PPDBStage2Bill):
        bill.updated_at = datetime.now(WIB)
        self.db.add(bill)
        self.db.flush()
        self.db.commit()
