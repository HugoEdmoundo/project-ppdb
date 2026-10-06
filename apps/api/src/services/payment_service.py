import math
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.models.ppdb import (
    PPDBBMOU,
    PPDBApplicantDiscount,
    PPDBStage2Bill,
    PPDBWaveFeeItem,
)
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

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        app_dict = {
            "id": applicant.id,
            "wave_id": applicant.wave_id,
            "user_id": applicant.user_id,
            "full_name": applicant.full_name,
            "email": applicant.email,
            "phone": applicant.phone,
            "registration_path": applicant.registration_path,
            "birth_place": applicant.birth_place,
            "birth_date": applicant.birth_date,
            "gender": applicant.gender,
            "nisn": applicant.nisn,
            "nik": applicant.nik,
            "parent_name": applicant.parent_name,
            "previous_school": applicant.previous_school,
            "province": applicant.province,
            "city": applicant.city,
            "district": applicant.district,
            "village": applicant.village,
            "postal_code": applicant.postal_code,
            "address": applicant.address,
            "status": applicant.status,
            "payment_status": applicant.payment_status,
            "payment_deadline": applicant.payment_deadline,
            "rejection_reason": applicant.rejection_reason,
            "wave_name": wave.name if wave else None,
            "wave_registration_end_date": (
                wave.registration_end_date.strftime("%Y-%m-%d")
                if wave and wave.registration_end_date
                else (
                    wave.end_date.strftime("%Y-%m-%d")
                    if wave and wave.end_date
                    else None
                )
            ),
            "wave_quota": wave.quota if wave else 0,
            "created_at": applicant.created_at,
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

    def check_wave_quota_and_close_if_full(self, wave_id: str | None) -> bool:
        """
        Cek apakah kuota pendaftaran gelombang sudah penuh berdasarkan
        pembayaran formulir sukses.
        Jika kuota tercapai, tutup gelombang dan batalkan tagihan pending.
        """
        if not wave_id:
            return False
        wave = self.repo.get_wave_by_id(wave_id)
        if not wave or wave.quota <= 0:
            return False

        paid_count = self.repo.count_paid_form_payments_in_wave(wave.id)
        if paid_count >= wave.quota:
            self.close_wave_and_cancel_pending_invoices(wave.id, reason="kuota penuh")
            return True
        return False

    def close_wave_and_cancel_pending_invoices(
        self, wave_id: str, reason: str = "kuota_penuh"
    ) -> dict:
        """
        Menutup gelombang dan membatalkan seluruh tagihan formulir pending
        saat kuota tercapai atau tanggal pendaftaran gelombang berakhir.
        Mengirim notifikasi wave_closed_pending_payment dan menghentikan
        penagihan Senin.
        """
        import logging

        from sqlalchemy import select

        from src.core.config import settings
        from src.core.notif_service import send_notification
        from src.models.ppdb import PPDBApplicant, PPDBPaymentTransaction

        logger = logging.getLogger("ptdarrahman.payment")
        wave = self.repo.get_wave_by_id(wave_id)
        if not wave:
            return {"closed": False, "message": "Gelombang tidak ditemukan"}

        now_wib = datetime.now(WIB)
        wave.status = "inactive"
        wave.updated_at = now_wib
        self.repo.db.add(wave)

        # Cari semua pendaftar berstatus pending_payment di gelombang ini
        stmt = select(PPDBApplicant).where(
            PPDBApplicant.wave_id == wave_id,
            PPDBApplicant.status == "pending_payment",
            PPDBApplicant.payment_status == "pending",
            PPDBApplicant.deleted_at.is_(None),
        )
        pending_applicants = list(self.repo.db.scalars(stmt).all())

        cancelled_count = 0
        for app in pending_applicants:
            # Batalkan transaksi formulir pending
            tx_stmt = select(PPDBPaymentTransaction).where(
                PPDBPaymentTransaction.applicant_id == app.id,
                PPDBPaymentTransaction.status == "pending",
            )
            pending_txs = list(self.repo.db.scalars(tx_stmt).all())
            for tx in pending_txs:
                tx.status = "cancelled"
                tx.failure_reason = f"Gelombang ditutup ({reason})"
                tx.updated_at = now_wib
                self.repo.db.add(tx)

            # Update status pendaftar menjadi expired
            app.status = "expired"
            app.payment_status = "failed"
            app.updated_at = now_wib
            self.repo.db.add(app)
            cancelled_count += 1

        self.repo.db.commit()

        # Kirim notifikasi pembatalan invoice ke setiap pendaftar yang terdampak
        for app in pending_applicants:
            try:
                send_notification(
                    event_key="wave_closed_pending_payment",
                    recipient_user_id=str(app.user_id),
                    context={
                        "nama_gelombang": wave.name,
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/auth/login",
                    },
                )
            except Exception:
                logger.exception(
                    "Gagal mengirim notifikasi wave_closed_pending_payment "
                    "untuk user %s",
                    app.user_id,
                )

        logger.info(
            "Gelombang %s ditutup (%s): %d pendaftar pending dibatalkan",
            wave_id,
            reason,
            cancelled_count,
        )
        return {
            "closed": True,
            "wave_id": wave_id,
            "cancelled_count": cancelled_count,
            "reason": reason,
        }

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

            # Notifikasi pembayaran berhasil — sistem baru: 1 pintu via QRIS/pak kasir
            try:
                from src.core.config import settings
                from src.core.notif_service import send_notifications

                nominal_fmt = f"Rp {tx.amount:,}".replace(",", ".")
                send_notifications(
                    [
                        (
                            "payment_success_formulir",
                            {
                                "nominal_bayar": nominal_fmt,
                                "link_aplikasi": (
                                    f"{settings.ppdb_frontend_url}/applicant"
                                ),
                            },
                        ),
                    ],
                    applicant.user_id,
                )
            except Exception:
                import logging

                logging.getLogger("ptdarrahman.payment").exception(
                    "Failed to send payment_success_formulir notification for tx %s",
                    transaction_id,
                )

            # Evaluasi kuota gelombang: tutup otomatis jika kuota terpenuhi
            self.check_wave_quota_and_close_if_full(applicant.wave_id)

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

    def process_pakkasir_webhook(self, payload: dict) -> dict:
        """
        Webhook 1 Pintu QRIS Pak Kasir untuk pembayaran formulir PPDB.
        Idempoten, atomik, dan otomatis menutup gelombang jika kuota terpenuhi.
        """
        import logging

        from src.core.config import settings
        from src.core.notif_service import send_notifications

        logger = logging.getLogger("ptdarrahman.payment")
        logger.info("Menerima webhook Pak Kasir: %s", payload)

        order_id = (
            payload.get("order_id")
            or payload.get("transaction_id")
            or payload.get("invoice_id")
            or payload.get("external_id")
            or payload.get("id")
        )
        applicant_id = payload.get("applicant_id")
        status = str(
            payload.get("status")
            or payload.get("transaction_status")
            or payload.get("payment_status")
            or ""
        ).upper()

        tx = None
        if order_id:
            tx = self.repo.get_transaction_by_id(
                str(order_id)
            ) or self.repo.get_transaction_by_external_id(str(order_id))

        if not tx and applicant_id:
            tx = self.repo.get_latest_transaction_by_applicant_id(str(applicant_id))

        if not tx:
            logger.warning(
                "Transaksi Pak Kasir tidak ditemukan untuk "
                "order_id=%s, applicant_id=%s",
                order_id,
                applicant_id,
            )
            raise HTTPException(
                status_code=404, detail="Transaction not found for this payment"
            )

        # Cek idempotensi: jika sudah sukses sebelumnya, langsung return sukses
        if tx.status == "success":
            logger.info("Transaksi %s sudah lunas sebelumnya (idempoten)", tx.id)
            return {
                "success": True,
                "message": "Transaksi sudah tercatat lunas sebelumnya",
                "status": "already_paid",
                "transaction_id": tx.id,
            }

        now_wib = datetime.now(WIB)
        is_success = status in ("PAID", "SUCCESS", "SETTLEMENT", "COMPLETED", "LUNAS")
        is_failed = status in ("FAILED", "CANCELLED", "EXPIRED", "GAGAL", "BATAL")

        if is_success:
            applicant = self.repo.get_applicant_by_id(tx.applicant_id)

            # Periksa apakah transaksi sebelumnya sudah dibatalkan atau kedaluwarsa
            # (misalnya kuota gelombang penuh sehingga tagihan dibatalkan otomatis)
            is_late_or_cancelled = tx.status in ("cancelled", "expired") or (
                applicant is not None and applicant.status in ("expired", "cancelled")
            )

            if is_late_or_cancelled:
                # Sesuai aturan bisnis docs/REQUIREMENTS.md & AGENTS.md:
                # "Jika webhook sukses datang setelah tagihan dibatalkan
                # (karena kuota penuh), tandai sebagai pengecualian untuk pemeriksaan
                # admin — jangan otomatis memindahkan pendaftar ke gelombang lain atau
                # langsung meluluskan tagihan."
                tx.status = "exception"
                tx.method = payload.get("payment_method") or "qris_pak_kasir"
                tx.confirmed_at = now_wib
                tx.notes = (
                    f"[PENGECUALIAN ADMIN] Pembayaran sukses terlambat diterima "
                    f"setelah tagihan dibatalkan/expired ({order_id or tx.id}). "
                    f"Memerlukan pemeriksaan manual admin."
                )
                self.repo.update_transaction(tx)

                logger.warning(
                    "Pembayaran terlambat terdeteksi untuk tx %s "
                    "(applicant %s). Ditandai sebagai pengecualian admin.",
                    tx.id,
                    tx.applicant_id,
                )
                return {
                    "success": True,
                    "message": (
                        "Pembayaran diterima setelah tagihan "
                        "dibatalkan/expired; ditandai sebagai pengecualian admin"
                    ),
                    "status": "exception",
                    "transaction_id": tx.id,
                }

            tx.status = "success"
            tx.method = payload.get("payment_method") or "qris_pak_kasir"
            tx.confirmed_at = now_wib
            tx.notes = f"Webhook Pak Kasir QRIS ({order_id or tx.id})"
            self.repo.update_transaction(tx)

            if applicant:
                applicant.payment_status = "paid"
                applicant.status = "document_uploaded_pending"
                self.repo.update_applicant(applicant)

                # Notifikasi WhatsApp formulir berhasil
                try:
                    nominal_fmt = f"Rp {tx.amount:,}".replace(",", ".")
                    send_notifications(
                        [
                            (
                                "payment_success_formulir",
                                {
                                    "nominal_bayar": nominal_fmt,
                                    "link_aplikasi": (
                                        f"{settings.ppdb_frontend_url}/applicant"
                                    ),
                                },
                            ),
                        ],
                        applicant.user_id,
                    )
                except Exception:
                    logger.exception(
                        "Gagal mengirim notif payment_success_formulir untuk tx %s",
                        tx.id,
                    )

                # Evaluasi penutupan gelombang jika kuota tercapai
                self.check_wave_quota_and_close_if_full(applicant.wave_id)

            return {
                "success": True,
                "message": (
                    "Pembayaran formulir berhasil diverifikasi " "via QRIS Pak Kasir"
                ),
                "transaction_id": tx.id,
            }

        elif is_failed:
            tx.status = "failed"
            tx.failure_reason = payload.get("failure_reason") or f"Status: {status}"
            self.repo.update_transaction(tx)
            return {"success": True, "status": tx.status, "transaction_id": tx.id}

        return {
            "success": True,
            "message": f"Webhook diterima dengan status: {status}",
            "transaction_id": tx.id,
        }

    def process_webhook(self, payload: dict) -> dict:
        return self.process_pakkasir_webhook(payload)

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

        wave = self.repo.get_wave_by_id(applicant.wave_id)
        paid_rank = self.repo.get_paid_form_payment_rank(
            applicant.id, applicant.wave_id
        )
        early_discount_eligible = bool(
            wave
            and wave.early_discount_quota > 0
            and paid_rank is not None
            and paid_rank <= wave.early_discount_quota
        )
        fee_items = self.repo.get_wave_fee_items_with_discounts(
            applicant.id, applicant.wave_id, early_discount_eligible
        )
        mou = self.repo.get_mou_by_applicant_id(applicant.id)

        return {
            "applicant": {
                "id": applicant.id,
                "full_name": applicant.full_name,
                "wave_id": applicant.wave_id,
                "form_payment_rank": paid_rank,
                "early_discount_eligible": early_discount_eligible,
                "early_discount_quota": wave.early_discount_quota if wave else 0,
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
            "{jenjang}": "SMK",
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
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )

        # Auto-initialize stage 2 bills if applicant is passed and has no bills yet
        if not bills and applicant.status == "passed" and applicant.wave_id:
            try:
                fee_items = self.repo.get_wave_fee_items_with_discounts(
                    applicant.id, applicant.wave_id
                )
                if (
                    not fee_items
                    and wave
                    and wave.second_stage_fee
                    and wave.second_stage_fee > 0
                ):
                    now_wib = datetime.now(WIB)
                    fi = PPDBWaveFeeItem(
                        id=str(uuid.uuid4()),
                        wave_id=wave.id,
                        name="Biaya Pendidikan Tahap 2",
                        nominal=wave.second_stage_fee,
                        order_index=1,
                        created_at=now_wib,
                        updated_at=now_wib,
                    )
                    self.repo.db.add(fi)
                    self.repo.db.commit()
                    fee_items = self.repo.get_wave_fee_items_with_discounts(
                        applicant.id, applicant.wave_id
                    )

                if fee_items:
                    items_payload = [
                        {
                            "fee_item_id": fi["id"],
                            "installment_count": 0,
                        }
                        for fi in fee_items
                    ]
                    self.save_applicant_discounts(applicant.id, items_payload)
                    bills = self.repo.get_my_stage2_bills(applicant.id)
            except Exception:
                pass

        mou = self.repo.get_mou_by_applicant_id(applicant.id)
        mou_signed = mou.status == "signed" if mou else False

        return {
            "bills": bills,
            "mou_signed": mou_signed,
            "minimum_dp": wave.minimum_dp if wave else 0,
            "second_stage_fee": wave.second_stage_fee if wave else 0,
        }

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

        # Notifikasi dp_payment_success (Fase 4 spec)
        try:
            from src.core.config import settings
            from src.core.notif_service import send_notification
            from src.models.content import SiteSetting

            applicant = self.repo.get_applicant_by_id(bill.applicant_id)
            if applicant:
                wa_link_setting = self.repo.db.get(
                    SiteSetting, "ppdb_whatsapp_group_link"
                )
                wa_link = (
                    wa_link_setting.value
                    if wa_link_setting and wa_link_setting.value
                    else f"{settings.ppdb_frontend_url}/dashboard"
                )

                send_notification(
                    "dp_payment_success",
                    applicant.user_id,
                    {
                        "nama_sekolah": "Pesantren Tahfidz Ar-Rahman",
                        "link_aplikasi": f"{settings.ppdb_frontend_url}/dashboard",
                        "link_grup_whatsapp": wa_link,
                    },
                )
        except Exception:
            import logging

            logging.getLogger("ptdarrahman.payment").exception(
                "dp_payment_success notification failed for bill %s; continuing",
                bill_id,
            )

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

    def configure_my_installment_plan(
        self, user_id: str, installment_count: int
    ) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")
        if applicant.status != "passed":
            raise HTTPException(
                status_code=400,
                detail="Hanya pendaftar yang lulus yang dapat mengatur cicilan",
            )
        if installment_count < 1 or installment_count > 12:
            raise HTTPException(
                status_code=400, detail="Jumlah cicilan harus antara 1 sampai 12"
            )

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        if not wave:
            raise HTTPException(status_code=400, detail="Gelombang tidak ditemukan")

        fee_items = self.repo.get_wave_fee_items_with_discounts(
            applicant.id, applicant.wave_id
        )
        if (
            not fee_items
            and wave
            and wave.second_stage_fee
            and wave.second_stage_fee > 0
        ):
            now_wib = datetime.now(WIB)
            fi = PPDBWaveFeeItem(
                id=str(uuid.uuid4()),
                wave_id=wave.id,
                name="Biaya Pendidikan Tahap 2",
                nominal=wave.second_stage_fee,
                order_index=1,
                created_at=now_wib,
                updated_at=now_wib,
            )
            self.repo.db.add(fi)
            self.repo.db.commit()
            fee_items = self.repo.get_wave_fee_items_with_discounts(
                applicant.id, applicant.wave_id
            )

        # Check if any bills are already paid
        for fee in fee_items:
            if self.repo.has_paid_stage2_bills(applicant.id, fee["id"]):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Terdapat tagihan yang sudah dibayar, skema cicilan "
                        "tidak dapat diubah"
                    ),
                )

        items_payload = []
        for fee in fee_items:
            is_dp = "dp" in fee["name"].lower() or "uang muka" in fee["name"].lower()
            icount = 0 if (is_dp or installment_count <= 1) else installment_count
            discount_type = (
                fee.get("discount", {}).get("discount_type")
                if fee.get("discount")
                else None
            )
            discount_value = (
                fee.get("discount", {}).get("discount_value")
                if fee.get("discount")
                else None
            )
            items_payload.append(
                {
                    "fee_item_id": fee["id"],
                    "installment_count": icount,
                    "discount_type": discount_type,
                    "discount_value": discount_value,
                }
            )

        self.save_applicant_discounts(applicant.id, items_payload)
        return {"success": True, "bills": self.repo.get_my_stage2_bills(applicant.id)}

    def upload_stage2_proof_batch(
        self, bill_ids: list[str], user_id: str, proof_url: str
    ) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        updated = 0
        for bid in bill_ids:
            bill = self.repo.get_stage2_bill_by_id(bid)
            if bill and bill.applicant_id == applicant.id and bill.status == "pending":
                bill.proof_url = proof_url
                self.repo.update_stage2_bill(bill)
                updated += 1

        if updated == 0:
            raise HTTPException(
                status_code=400, detail="Tidak ada tagihan valid yang dapat diperbarui"
            )

        return {"success": True, "updated_count": updated, "proof_url": proof_url}
