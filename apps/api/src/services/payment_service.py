import hashlib
import hmac
import json
import logging
import math
import time
import uuid
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from src.core.config import settings
from src.core.pakasir import (
    STATUS_CANCELED,
    STATUS_COMPLETED,
    PakasirError,
    PakasirUncertainError,
    canonical_status,
    get_pakasir_client,
)
from src.models.ppdb import (
    PPDBApplicant,
    PPDBApplicantDiscount,
    PPDBPaymentTransaction,
    PPDBStage2Bill,
    PPDBWave,
    PPDBWaveFeeItem,
)
from src.repositories.payment_repository import PaymentRepository
from src.repositories.ppdb_scope import get_active_period_info

logger = logging.getLogger("ptdarrahman.payment")
WIB = ZoneInfo("Asia/Jakarta")

# Status transaksi lokal yang masih "terbuka" dan memblokir transaksi baru
# sampai statusnya dipastikan ke provider.
OPEN_TRANSACTION_STATUSES = ("pending", "pending_verification")
PENDING_VERIFICATION = "pending_verification"


def create_secure_doc_token(doc_type: str, entity_id: str, exp_hours: int = 168) -> str:
    """Create a tamper-proof HMAC token for secure document / receipt / SKD access."""
    secret = (settings.jwt_secret or "secret-key-fallback").encode("utf-8")
    exp = int(time.time()) + (exp_hours * 3600)
    data = f"{doc_type}:{entity_id}:{exp}"
    signature = hmac.new(secret, data.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{data}:{signature}"


def verify_secure_doc_token(token: str, expected_doc_type: str | None = None) -> str:
    """Verify HMAC token and return entity_id.

    Raises HTTPException(403) if invalid or expired.
    """
    parts = token.split(":")
    if len(parts) != 4:
        raise HTTPException(status_code=403, detail="Tautan dokumen tidak valid")
    doc_type, entity_id, exp_str, signature = parts
    try:
        exp = int(exp_str)
    except ValueError:
        raise HTTPException(status_code=403, detail="Tautan dokumen tidak valid")
    if time.time() > exp:
        raise HTTPException(status_code=403, detail="Tautan dokumen telah kedaluwarsa")
    if expected_doc_type and doc_type != expected_doc_type:
        raise HTTPException(status_code=403, detail="Tipe dokumen tidak sesuai")
    secret = (settings.jwt_secret or "secret-key-fallback").encode("utf-8")
    data = f"{doc_type}:{entity_id}:{exp}"
    expected_sig = hmac.new(secret, data.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(status_code=403, detail="Tanda tangan tautan tidak sah")
    return entity_id


class PaymentService:
    def __init__(self, repo: PaymentRepository):
        self.repo = repo

    def get_transactions(self, page: int, per_page: int, status: str | None) -> dict:
        offset = (page - 1) * per_page
        # Scope halaman operasional admin = seluruh gelombang dalam periode aktif.
        active_period = get_active_period_info(self.repo.db)
        if not active_period:
            return {
                "data": [],
                "total": 0,
                "active_wave": None,
                "active_period": None,
            }

        data, total = self.repo.get_transactions(
            active_period["id"], status, per_page, offset
        )
        return {
            "data": data,
            "total": total,
            "active_wave": self.repo.get_active_wave_info(),
            "active_period": active_period,
        }

    def calculate_applicant_financials(
        self, applicant_id: str, exclude_tx_id: str | None = None
    ) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )

        early_discount_eligible = False
        if wave and wave.early_discount_quota and wave.early_discount_quota > 0:
            paid_rank = self.repo.get_paid_form_payment_rank(
                applicant.id, applicant.wave_id
            )
            early_discount_eligible = bool(
                paid_rank is not None and paid_rank <= wave.early_discount_quota
            )

        fee_items = (
            self.repo.get_wave_fee_items_with_discounts(
                applicant.id, applicant.wave_id, early_discount_eligible
            )
            if applicant.wave_id
            else []
        )

        total_obligation = 0
        if fee_items:
            total_obligation = sum(
                int(item.get("final_amount", 0)) for item in fee_items
            )
        elif wave and wave.second_stage_fee and wave.second_stage_fee > 0:
            total_obligation = int(wave.second_stage_fee)
        else:
            total_obligation = 15000000

        minimum_dp = int(
            wave.minimum_dp
            if (wave and wave.minimum_dp and wave.minimum_dp > 0)
            else 5000000
        )

        txs = self.repo.get_applicant_transactions(applicant.id)
        if exclude_tx_id:
            txs = [t for t in txs if t.id != exclude_tx_id]

        dp_tx = next(
            (
                t
                for t in txs
                if t.payment_type == "dp" and t.status in ("success", "paid")
            ),
            None,
        )
        is_dp_paid = bool(dp_tx or applicant.dp_status == "paid")
        dp_amount_paid = dp_tx.amount if dp_tx else (minimum_dp if is_dp_paid else 0)
        dp_paid_at = (
            dp_tx.paid_at if (dp_tx and dp_tx.paid_at) else applicant.dp_paid_at
        )

        successful_installments = [
            t
            for t in txs
            if t.payment_type == "installment" and t.status in ("success", "paid")
        ]
        installment_total_paid = sum(int(t.amount) for t in successful_installments)
        successful_installments_count = len(successful_installments)

        total_paid = (dp_amount_paid if is_dp_paid else 0) + installment_total_paid
        remaining_balance = max(0, total_obligation - total_paid)
        is_lunas = bool(is_dp_paid and remaining_balance == 0)

        return {
            "applicant_id": applicant.id,
            "total_obligation": int(total_obligation),
            "minimum_dp": int(minimum_dp),
            "dp_amount": int(minimum_dp),
            "dp_paid": is_dp_paid,
            "dp_paid_at": dp_paid_at.isoformat() if dp_paid_at else None,
            "dp_amount_paid": int(dp_amount_paid),
            "successful_installments_count": successful_installments_count,
            "installment_total_paid": int(installment_total_paid),
            "total_paid": int(total_paid),
            "remaining_balance": int(remaining_balance),
            "is_lunas": is_lunas,
            "fee_breakdown": fee_items,
        }

    def _format_transaction_response(
        self, tx: PPDBPaymentTransaction, applicant: PPDBApplicant | None = None
    ) -> dict:
        now_wib = datetime.now(WIB)
        expires_in_sec = 0
        if tx.expired_at:
            exp_dt = (
                tx.expired_at
                if tx.expired_at.tzinfo
                else tx.expired_at.replace(tzinfo=WIB)
            )
            expires_in_sec = max(0, int((exp_dt - now_wib).total_seconds()))

        receipt_token = None
        if tx.status in ("success", "paid"):
            receipt_token = create_secure_doc_token("receipt", tx.id, exp_hours=720)

        return {
            "id": tx.id,
            "order_id": tx.order_id,
            "txn_id": tx.txn_id,
            "payment_type": tx.payment_type,
            "installment_number": tx.installment_number,
            "amount": int(tx.amount) if tx.amount is not None else 0,
            "status": tx.status,
            "provider_status": tx.provider_status,
            "method": tx.method,
            "qr_string": tx.qr_string,
            "expired_at": tx.expired_at.isoformat() if tx.expired_at else None,
            "paid_at": tx.paid_at.isoformat() if tx.paid_at else None,
            "expires_in_seconds": expires_in_sec,
            "receipt_number": tx.receipt_number,
            "receipt_token": receipt_token,
            "receipt_url": (
                f"{settings.ppdb_frontend_url}/receipt/{tx.id}?token={receipt_token}"
                if receipt_token
                else None
            ),
            "financial_snapshot": {
                "total_obligation": tx.total_obligation,
                "total_paid_before": tx.total_paid_before,
                "remaining_before": tx.remaining_before,
                "total_paid_after": tx.total_paid_after,
                "remaining_after": tx.remaining_after,
                "is_lunas": (
                    tx.remaining_after == 0 if tx.remaining_after is not None else False
                ),
            },
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
        }

    @staticmethod
    def _parse_expired_at(raw: str | None) -> datetime | None:
        """Parse expired_at provider (ISO8601 atau 'YYYY-MM-DD HH:MM:SS')."""
        if not raw:
            return None
        try:
            if "T" in raw:
                dt = datetime.fromisoformat(raw)
            else:
                dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=WIB)
        return dt

    def _save_pending_verification(
        self,
        applicant: PPDBApplicant,
        order_id: str,
        payment_type: str,
        amount: int,
        txn_id: str | None,
        reason: str,
    ) -> PPDBPaymentTransaction:
        """Simpan transaksi berstatus ``pending_verification``.

        Dipakai ketika respons create-transaction tidak pasti/tidak lengkap.
        Status ini memblokir transaksi baru (mencegah dobel bayar) dan menjadi
        penanda agar dapat direkonsiliasi tanpa menganggapnya gagal/expired.
        """
        now_wib = datetime.now(WIB)
        tx = PPDBPaymentTransaction(
            id=str(uuid.uuid4()),
            applicant_id=applicant.id,
            order_id=order_id,
            txn_id=txn_id,
            payment_type=payment_type,
            amount=amount,
            status=PENDING_VERIFICATION,
            provider_status="unknown",
            method="qris_pakasir",
            qr_string=None,
            expired_at=now_wib + timedelta(minutes=15),
            notes=f"[REKONSILIASI] {reason}",
            created_at=now_wib,
            updated_at=now_wib,
        )
        self.repo.save_transaction(tx)
        return tx

    def _apply_provider_status(self, tx: PPDBPaymentTransaction, result) -> str:
        """Terapkan status provider terverifikasi ke transaksi lokal."""
        tx.provider_status = result.provider_status
        if result.status == "completed":
            self._settle_successful_transaction(tx, gateway_payload=result.raw)
            return str(tx.status)
        if result.status == "canceled":
            tx.status = "cancelled"
            tx.updated_at = datetime.now(WIB)
            self.repo.update_transaction(tx)
            return str(tx.status)
        # pending / unknown → pertahankan status lokal apa adanya (jangan
        # mengubah menjadi expired hanya karena countdown lokal berakhir).
        self.repo.update_transaction(tx)
        return str(tx.status)

    def _reconcile_transaction(
        self, tx: PPDBPaymentTransaction, applicant: PPDBApplicant | None = None
    ) -> str:
        """Sinkronkan transaksi lokal terbuka dengan status provider.

        Tidak melempar untuk hasil yang tidak pasti: status lokal dipertahankan
        agar pembayaran yang sudah masuk tidak salah ditandai gagal/expired.
        Mengembalikan status lokal hasil rekonsiliasi.
        """
        if tx.status in ("success", "paid", "cancelled", "failed", "expired"):
            return str(tx.status)

        pakasir = get_pakasir_client()
        try:
            if tx.txn_id:
                result = pakasir.get_transaction_status(tx.txn_id)
                return self._apply_provider_status(tx, result)
            # txn_id belum ada → pulihkan lewat create idempotent. Pakasir v2
            # bersifat find-or-create: (slug, order_id) sama → transaksi sama.
            if tx.order_id and tx.amount:
                created = pakasir.create_transaction(
                    order_id=tx.order_id, amount=int(tx.amount)
                )
                tx.txn_id = created.txn_id
                if created.qr_string:
                    tx.qr_string = created.qr_string
                parsed = self._parse_expired_at(created.expired_at)
                if parsed:
                    tx.expired_at = parsed
                tx.status = "pending"
                tx.provider_status = "pending"
                self.repo.update_transaction(tx)
                return str(tx.status)
        except PakasirUncertainError as exc:
            logger.warning(
                "Rekonsiliasi tx %s belum pasti (status dipertahankan): %s",
                tx.id,
                exc.message,
            )
            return str(tx.status)
        except PakasirError as exc:
            logger.warning("Rekonsiliasi tx %s gagal: %s", tx.id, exc.message)
            return str(tx.status)
        return str(tx.status)

    def get_my_transaction(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant record not found")

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
            "registration_number": applicant.registration_number
            or applicant.id[:8].upper(),
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
            "is_loa_signed": applicant.is_loa_signed,
            "loa_signed_at": (
                applicant.loa_signed_at.isoformat() if applicant.loa_signed_at else None
            ),
            "dp_status": applicant.dp_status,
            "dp_paid_at": (
                applicant.dp_paid_at.isoformat() if applicant.dp_paid_at else None
            ),
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

        form_tx = self.repo.get_latest_transaction_by_applicant_id(applicant.id)
        tx_dict = (
            self._format_transaction_response(form_tx, applicant) if form_tx else None
        )

        active_tx = self.repo.get_active_transaction(applicant.id)
        # Jangan auto-expire di jalur baca: status provider belum tentu
        # terverifikasi. Frontend memanggil sync-status untuk kepastian.
        active_dict = (
            self._format_transaction_response(active_tx, applicant)
            if active_tx
            else None
        )

        financials = self.calculate_applicant_financials(applicant.id)
        all_txs = self.repo.get_applicant_transactions(applicant.id)
        recent_txs = [self._format_transaction_response(t, applicant) for t in all_txs]

        return {
            "applicant": app_dict,
            "transaction": tx_dict,
            "active_transaction": active_dict,
            "financials": financials,
            "recent_transactions": recent_txs,
        }

    def get_receipt(
        self,
        transaction_id: str,
        token: str | None = None,
        user_id: str | None = None,
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(
                status_code=404, detail="Kuitansi pembayaran tidak ditemukan"
            )

        if token:
            verified_id = verify_secure_doc_token(token, "receipt")
            if verified_id != tx.id:
                raise HTTPException(
                    status_code=403, detail="Tanda tangan tautan kuitansi tidak sesuai"
                )
        elif user_id:
            pass
        else:
            raise HTTPException(
                status_code=401,
                detail="Diperlukan autentikasi atau tautan kuitansi yang sah",
            )

        if tx.status not in ("paid", "settlement", "success"):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Kuitansi resmi hanya tersedia untuk transaksi yang "
                    "sudah terverifikasi sukses."
                ),
            )

        applicant = (
            self.repo.get_applicant_by_id(tx.applicant_id) if tx.applicant_id else None
        )
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id)
            if (applicant and applicant.wave_id)
            else None
        )

        dt = tx.paid_at or tx.confirmed_at or tx.updated_at or tx.created_at
        receipt_no = (
            tx.receipt_number or f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
        )

        payment_type_label = "Biaya Formulir Pendaftaran"
        if tx.payment_type == "dp":
            payment_type_label = "Pembayaran Uang Muka (DP) Tahap 2"
        elif tx.payment_type == "installment":
            if tx.installment_number:
                payment_type_label = (
                    "Cicilan Biaya Pendidikan Tahap 2 "
                    f"(Cicilan ke-{tx.installment_number})"
                )
            else:
                payment_type_label = "Cicilan Biaya Pendidikan Tahap 2"

        return {
            "id": tx.id,
            "receipt_no": receipt_no,
            "order_id": tx.order_id,
            "txn_id": tx.txn_id,
            "payment_type": tx.payment_type,
            "payment_type_label": payment_type_label,
            "installment_number": tx.installment_number,
            "applicant_name": applicant.full_name if applicant else "Calon Santri",
            "registration_number": (
                (applicant.registration_number or applicant.id[:8].upper())
                if applicant
                else ""
            ),
            "registration_path": (
                (applicant.registration_path or "Reguler") if applicant else "Reguler"
            ).upper(),
            "wave_name": wave.name if wave else None,
            "amount": int(tx.amount) if tx.amount is not None else 0,
            "payment_method": (tx.method or "QRIS").upper(),
            "payment_date": dt.isoformat() if dt else None,
            "status": tx.status,
            "is_paid": True,
            "financial_snapshot": {
                "total_obligation": tx.total_obligation,
                "total_paid_before": tx.total_paid_before,
                "remaining_before": tx.remaining_before,
                "amount_paid": tx.amount,
                "total_paid_after": tx.total_paid_after,
                "remaining_after": tx.remaining_after,
                "is_lunas": (
                    tx.remaining_after == 0 if tx.remaining_after is not None else False
                ),
            },
            "secure_token": create_secure_doc_token("receipt", tx.id, exp_hours=720),
        }

    def get_public_receipt(self, id: str) -> dict:
        tx = self.repo.get_transaction_by_id(id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(id)
        if not tx:
            tx = self.repo.get_latest_transaction_by_applicant_id(id)

        if not tx:
            raise HTTPException(
                status_code=404, detail="Kuitansi pembayaran tidak ditemukan"
            )

        if tx.status not in ("paid", "settlement", "success"):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Kuitansi resmi hanya tersedia untuk transaksi yang "
                    "sudah terverifikasi sukses."
                ),
            )

        token = create_secure_doc_token("receipt", tx.id, exp_hours=720)
        return self.get_receipt(transaction_id=tx.id, token=token)

    def create_qris_transaction(
        self, user_id: str, payment_type: str, amount: int | None = None
    ) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Data pendaftar tidak ditemukan"
            )

        # 1. Periksa transaksi terbuka (pending / pending_verification).
        #    JANGAN menganggap expired hanya dari countdown lokal: verifikasi
        #    dulu ke provider agar pembayaran yang sudah masuk tidak salah
        #    ditandai gagal, dan cegah transaksi baru yang menggandakan bayar.
        active_tx = self.repo.get_active_transaction(applicant.id)
        if active_tx:
            self._reconcile_transaction(active_tx, applicant)
            if active_tx.status in ("success", "paid"):
                return self._format_transaction_response(active_tx, applicant)
            if active_tx.status in OPEN_TRANSACTION_STATUSES:
                if active_tx.payment_type == payment_type and (
                    amount is None or active_tx.amount == amount
                ):
                    return self._format_transaction_response(active_tx, applicant)
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Anda memiliki transaksi QRIS yang belum terverifikasi. "
                        "Silakan selesaikan atau batalkan transaksi tersebut "
                        "terlebih dahulu sebelum membuat pembayaran baru."
                    ),
                )

        # 2. Validasi aturan bisnis per payment_type
        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )

        if payment_type == "form":
            if applicant.payment_status == "paid":
                raise HTTPException(
                    status_code=400, detail="Biaya formulir pendaftaran sudah lunas."
                )
            if wave and wave.quota > 0:
                paid_count = self.repo.count_paid_form_payments_in_wave(wave.id)
                if paid_count >= wave.quota:
                    self.close_wave_and_cancel_pending_invoices(
                        wave.id, reason="kuota penuh"
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Pendaftaran ditutup: Kuota gelombang ini telah "
                            "terpenuhi."
                        ),
                    )
            final_amount = int(
                wave.registration_fee
                if (wave and wave.registration_fee is not None)
                else 250000
            )

        elif payment_type == "dp":
            if applicant.status != "passed":
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Hanya pendaftar yang dinyatakan lulus yang dapat "
                        "membayar DP."
                    ),
                )
            if not applicant.is_loa_signed:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Dokumen LoA harus ditandatangani terlebih dahulu "
                        "sebelum melakukan pembayaran DP."
                    ),
                )
            financials = self.calculate_applicant_financials(applicant.id)
            if financials["dp_paid"]:
                raise HTTPException(
                    status_code=400, detail="Pembayaran DP sudah selesai diverifikasi."
                )
            final_amount = int(
                wave.minimum_dp
                if (wave and wave.minimum_dp and wave.minimum_dp > 0)
                else 5000000
            )

        elif payment_type == "installment":
            if applicant.status != "passed":
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Hanya pendaftar yang dinyatakan lulus yang dapat "
                        "membayar cicilan Tahap 2."
                    ),
                )
            financials = self.calculate_applicant_financials(applicant.id)
            if not financials["dp_paid"]:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Pembayaran DP harus diselesaikan dan diverifikasi "
                        "terlebih dahulu sebelum membayar cicilan Tahap 2."
                    ),
                )
            remaining = financials["remaining_balance"]
            if remaining <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Semua kewajiban tagihan LoA telah LUNAS. Tidak ada "
                        "saldo tagihan yang tersisa."
                    ),
                )
            if amount is None or amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Nominal pembayaran cicilan harus lebih dari 0.",
                )
            final_amount = int(amount)
            if final_amount > remaining:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Nominal pembayaran (Rp {final_amount:,}) melebihi "
                        f"sisa tagihan (Rp {remaining:,})."
                    ).replace(",", "."),
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Jenis pembayaran '{payment_type}' tidak valid.",
            )

        # 3. Generate unique internal order_id
        prefix = f"PPDB-{payment_type.upper()}"
        short_app = applicant.id.replace("-", "")[:8].upper()
        unique_suffix = uuid.uuid4().hex[:6].upper()
        order_id = f"{prefix}-{short_app}-{unique_suffix}"

        # 4. Panggil Pakasir API v2 (find-or-create) & normalisasi hasilnya
        pakasir = get_pakasir_client()
        try:
            created = pakasir.create_transaction(order_id=order_id, amount=final_amount)
        except PakasirUncertainError as exc:
            # Hasil tidak pasti → provider mungkin sudah membuat transaksi.
            # Simpan penanda rekonsiliasi (bukan pending biasa) lalu lapor.
            self._save_pending_verification(
                applicant=applicant,
                order_id=order_id,
                payment_type=payment_type,
                amount=final_amount,
                txn_id=None,
                reason=f"Respons gateway tidak pasti: {exc.message}",
            )
            logger.warning(
                "create-transaction hasil tidak pasti (order_id=%s): %s",
                order_id,
                exc.message,
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Status pembuatan pembayaran belum dapat dipastikan. "
                    "Transaksi ditandai untuk rekonsiliasi — mohon cek status "
                    "beberapa saat lagi sebelum mengulang."
                ),
            ) from exc
        except PakasirError as exc:
            logger.exception("Gagal membuat transaksi Pakasir: %s", exc.message)
            raise HTTPException(
                status_code=502,
                detail=f"Gagal membuat transaksi ke payment gateway: {exc.message}",
            ) from exc

        # 4b. Field wajib QRIS: txn_id + qr_string. Tanpa keduanya transaksi
        #     tidak dapat dibayar, jadi tidak boleh disimpan sebagai pending.
        if not created.txn_id or not created.qr_string:
            missing = ", ".join(
                name
                for name, value in (
                    ("txn_id", created.txn_id),
                    ("qr_string", created.qr_string),
                )
                if not value
            )
            self._save_pending_verification(
                applicant=applicant,
                order_id=order_id,
                payment_type=payment_type,
                amount=final_amount,
                txn_id=created.txn_id,
                reason=f"Respons gateway tidak lengkap ({missing} kosong)",
            )
            logger.error(
                "Respons create-transaction tidak lengkap untuk order_id=%s: %s",
                order_id,
                missing,
            )
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gateway membalas data pembayaran yang tidak lengkap. "
                    "Transaksi ditandai untuk rekonsiliasi — mohon cek status "
                    "beberapa saat lagi."
                ),
            )

        now_wib = datetime.now(WIB)
        expired_dt = self._parse_expired_at(created.expired_at) or (
            now_wib + timedelta(minutes=15)
        )

        tx = PPDBPaymentTransaction(
            id=str(uuid.uuid4()),
            applicant_id=applicant.id,
            order_id=order_id,
            txn_id=created.txn_id,
            payment_type=payment_type,
            amount=final_amount,
            status="pending",
            provider_status="pending",
            method="qris_pakasir",
            qr_string=created.qr_string,
            expired_at=expired_dt,
            created_at=now_wib,
            updated_at=now_wib,
        )
        self.repo.save_transaction(tx)
        return self._format_transaction_response(tx, applicant)

    def get_active_transaction(self, user_id: str) -> dict:
        applicant = self.repo.get_applicant_by_user_id(user_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        active_tx = self.repo.get_active_transaction(applicant.id)
        if not active_tx:
            return {"active_transaction": None}

        return {
            "active_transaction": self._format_transaction_response(
                active_tx, applicant
            )
        }

    def sync_transaction_status(
        self, transaction_id: str, user_id: str | None = None
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

        if user_id:
            applicant = self.repo.get_applicant_by_user_id(user_id)
            if applicant and tx.applicant_id != applicant.id:
                raise HTTPException(status_code=403, detail="Akses ditolak")

        if tx.status in ("success", "paid"):
            return {
                "status": "success",
                "message": "Transaksi sudah terverifikasi sukses",
                "transaction": self._format_transaction_response(tx),
            }

        # Rekonsiliasi ke provider. Status lokal hanya berubah bila provider
        # memberi kepastian (completed/canceled).
        self._reconcile_transaction(tx)

        if tx.status in ("success", "paid"):
            return {
                "status": "success",
                "message": "Pembayaran berhasil diverifikasi",
                "transaction": self._format_transaction_response(tx),
            }
        if tx.status == "cancelled":
            return {
                "status": "cancelled",
                "message": "Transaksi telah dibatalkan di gateway",
                "transaction": self._format_transaction_response(tx),
            }
        if tx.status == "exception":
            return {
                "status": "exception",
                "message": (
                    "Pembayaran diterima setelah tagihan dibatalkan — "
                    "menunggu pemeriksaan admin."
                ),
                "transaction": self._format_transaction_response(tx),
            }

        # pending / pending_verification → status belum pasti. JANGAN tandai
        # expired hanya karena countdown lokal berakhir.
        return {
            "status": tx.status,
            "provider_status": tx.provider_status,
            "message": (
                "Belum dapat memastikan status pembayaran di gateway. "
                "Status dipertahankan untuk pemeriksaan ulang."
            ),
            "transaction": self._format_transaction_response(tx),
        }

    def cancel_transaction(
        self, transaction_id: str, user_id: str | None = None
    ) -> dict:
        tx = self.repo.get_transaction_by_id(transaction_id)
        if not tx:
            tx = self.repo.get_transaction_by_order_id(transaction_id)
        if not tx:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

        if user_id:
            applicant = self.repo.get_applicant_by_user_id(user_id)
            if applicant and tx.applicant_id != applicant.id:
                raise HTTPException(status_code=403, detail="Akses ditolak")

        if tx.status in ("success", "paid"):
            raise HTTPException(
                status_code=400,
                detail="Transaksi yang sudah sukses tidak dapat dibatalkan",
            )

        now_wib = datetime.now(WIB)

        # Tanpa txn_id, transaksi belum terkonfirmasi ada di provider →
        # cukup batalkan lokal.
        if not tx.txn_id:
            tx.status = "cancelled"
            tx.provider_status = "canceled"
            tx.updated_at = now_wib
            self.repo.update_transaction(tx)
            return {"success": True, "message": "Transaksi berhasil dibatalkan."}

        pakasir = get_pakasir_client()
        try:
            result = pakasir.cancel_transaction(tx.txn_id)
        except PakasirUncertainError as exc:
            logger.warning(
                "Pembatalan tx %s tidak pasti, sinkronisasi status: %s",
                tx.id,
                exc.message,
            )
            return self._finalize_cancel_after_reconcile(tx, now_wib)
        except PakasirError as exc:
            logger.warning("Gagal membatalkan transaksi di Pakasir v2: %s", exc.message)
            raise HTTPException(
                status_code=502,
                detail=f"Gagal membatalkan transaksi di gateway: {exc.message}",
            ) from exc

        if not result.confirmed:
            # 2xx tanpa bukti pembatalan → verifikasi via status transaksi.
            return self._finalize_cancel_after_reconcile(tx, now_wib)

        tx.status = "cancelled"
        tx.provider_status = "canceled"
        tx.updated_at = now_wib
        self.repo.update_transaction(tx)
        return {"success": True, "message": "Transaksi berhasil dibatalkan."}

    def _finalize_cancel_after_reconcile(
        self, tx: PPDBPaymentTransaction, now_wib: datetime
    ) -> dict:
        """Putuskan status lokal setelah pembatalan provider tidak pasti."""
        self._reconcile_transaction(tx)
        if tx.status == "cancelled":
            return {"success": True, "message": "Transaksi berhasil dibatalkan."}
        if tx.status in ("success", "paid"):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Pembatalan tidak dapat dipastikan: pembayaran sudah "
                    "terverifikasi sukses di gateway."
                ),
            )
        tx.provider_status = "cancel_requested"
        tx.updated_at = now_wib
        self.repo.update_transaction(tx)
        return {
            "success": False,
            "status": tx.status,
            "message": (
                "Permintaan pembatalan terkirim, tetapi status gateway belum "
                "dapat dipastikan. Silakan cek kembali beberapa saat lagi."
            ),
        }

    def _send_dp_success_notification(
        self, applicant: PPDBApplicant, tx: PPDBPaymentTransaction
    ) -> None:
        try:
            from src.core.config import settings
            from src.core.notif_service import send_notification
            from src.models.ppdb import PPDBPeriod, PPDBWave

            wave = (
                self.repo.db.get(PPDBWave, applicant.wave_id)
                if applicant.wave_id
                else None
            )
            period = (
                self.repo.db.get(PPDBPeriod, wave.period_id)
                if wave and wave.period_id
                else None
            )
            wa_link = (
                period.wa_group_link
                if period and period.wa_group_link
                else f"{settings.ppdb_frontend_url}/applicant"
            )

            skd_token = create_secure_doc_token("skd", applicant.id, exp_hours=720)
            skd_link = f"{settings.ppdb_frontend_url}/applicant?skd_token={skd_token}"

            send_notification(
                "dp_payment_success",
                applicant.user_id,
                {
                    "nama_peserta": applicant.full_name,
                    "nama_sekolah": "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman",
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant",
                    "link_grup_whatsapp": wa_link,
                    "link_skd": skd_link,
                    "nominal_bayar": f"Rp {tx.amount:,}".replace(",", "."),
                },
            )
        except Exception:
            logger.exception(
                "Gagal mengirim notifikasi dp_payment_success untuk tx %s", tx.id
            )

    def _send_installment_success_notification(
        self, applicant: PPDBApplicant, tx: PPDBPaymentTransaction
    ) -> None:
        try:
            from src.core.config import settings
            from src.core.notif_service import send_notification

            receipt_token = create_secure_doc_token("receipt", tx.id, exp_hours=720)
            receipt_link = (
                f"{settings.ppdb_frontend_url}/receipt/{tx.id}?token={receipt_token}"
            )

            status_pelunasan = (
                "LUNAS"
                if (tx.remaining_after is not None and tx.remaining_after == 0)
                else "Belum Lunas"
            )
            nominal_fmt = f"Rp {tx.amount:,}".replace(",", ".")
            total_paid_fmt = f"Rp {(tx.total_paid_after or 0):,}".replace(",", ".")
            remaining_fmt = f"Rp {(tx.remaining_after or 0):,}".replace(",", ".")

            send_notification(
                "stage2_installment_success",
                applicant.user_id,
                {
                    "nama_lengkap": applicant.full_name,
                    "nama_peserta": applicant.full_name,
                    "nomor_cicilan": str(tx.installment_number or 1),
                    "nominal_bayar": nominal_fmt,
                    "total_terbayar": total_paid_fmt,
                    "sisa_tagihan": remaining_fmt,
                    "status_pelunasan": status_pelunasan,
                    "link_kuitansi": receipt_link,
                    "link_aplikasi": f"{settings.ppdb_frontend_url}/applicant",
                },
            )
        except Exception:
            logger.exception(
                "Gagal mengirim notifikasi stage2_installment_success untuk tx %s",
                tx.id,
            )

    def _settle_successful_transaction(
        self, tx: PPDBPaymentTransaction, gateway_payload: Any = None
    ) -> dict:
        if tx.status in ("success", "paid"):
            return {"status": "success", "already_settled": True}

        now_wib = datetime.now(WIB)
        applicant = self.repo.get_applicant_by_id(tx.applicant_id)
        if not applicant:
            raise HTTPException(
                status_code=404, detail="Applicant not found for transaction"
            )

        ptype = tx.payment_type or "form"
        if ptype == "form":
            is_late_or_cancelled = tx.status in ("cancelled", "expired") or (
                applicant is not None and applicant.status in ("expired", "cancelled")
            )
            if is_late_or_cancelled:
                tx.status = "exception"
                tx.provider_status = "completed"
                tx.method = "qris_pakasir"
                tx.confirmed_at = now_wib
                tx.notes = (
                    "[PENGECUALIAN ADMIN] Pembayaran formulir sukses terlambat "
                    f"diterima setelah tagihan dibatalkan/expired "
                    f"({tx.order_id or tx.id})."
                )
                self.repo.update_transaction(tx)
                return {"status": "exception", "message": "Marked as admin exception"}

            tx.status = "success"
            tx.provider_status = "completed"
            tx.paid_at = now_wib
            tx.confirmed_at = now_wib
            tx.receipt_number = f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
            if gateway_payload:
                tx.gateway_payload = (
                    json.dumps(gateway_payload)
                    if isinstance(gateway_payload, dict)
                    else str(gateway_payload)
                )
            self.repo.update_transaction(tx)

            applicant.payment_status = "paid"
            applicant.status = "document_uploaded_pending"
            self.repo.update_applicant(applicant)

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
                logger.exception(
                    "Gagal mengirim notif payment_success_formulir untuk tx %s", tx.id
                )

            self.check_wave_quota_and_close_if_full(applicant.wave_id)

        elif tx.payment_type == "dp":
            fin_before = self.calculate_applicant_financials(
                applicant.id, exclude_tx_id=tx.id
            )
            total_obligation = fin_before["total_obligation"]
            total_paid_before = fin_before["total_paid"]
            remaining_before = fin_before["remaining_balance"]

            total_paid_after = total_paid_before + tx.amount
            remaining_after = max(0, total_obligation - total_paid_after)

            tx.status = "success"
            tx.provider_status = "completed"
            tx.paid_at = now_wib
            tx.confirmed_at = now_wib
            tx.receipt_number = f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
            tx.total_obligation = total_obligation
            tx.total_paid_before = total_paid_before
            tx.remaining_before = remaining_before
            tx.total_paid_after = total_paid_after
            tx.remaining_after = remaining_after
            if gateway_payload:
                tx.gateway_payload = (
                    json.dumps(gateway_payload)
                    if isinstance(gateway_payload, dict)
                    else str(gateway_payload)
                )
            self.repo.update_transaction(tx)

            applicant.dp_status = "paid"
            applicant.dp_paid_at = now_wib
            self.repo.update_applicant(applicant)

            self._send_dp_success_notification(applicant, tx)

        elif tx.payment_type == "installment":
            inst_count = self.repo.count_successful_installments(applicant.id)
            tx.installment_number = inst_count + 1

            fin_before = self.calculate_applicant_financials(
                applicant.id, exclude_tx_id=tx.id
            )
            total_obligation = fin_before["total_obligation"]
            total_paid_before = fin_before["total_paid"]
            remaining_before = fin_before["remaining_balance"]

            total_paid_after = total_paid_before + tx.amount
            remaining_after = max(0, total_obligation - total_paid_after)

            tx.status = "success"
            tx.provider_status = "completed"
            tx.paid_at = now_wib
            tx.confirmed_at = now_wib
            tx.receipt_number = f"KUI-PPDB-{tx.id.replace('-', '')[:12].upper()}"
            tx.total_obligation = total_obligation
            tx.total_paid_before = total_paid_before
            tx.remaining_before = remaining_before
            tx.total_paid_after = total_paid_after
            tx.remaining_after = remaining_after
            if gateway_payload:
                tx.gateway_payload = (
                    json.dumps(gateway_payload)
                    if isinstance(gateway_payload, dict)
                    else str(gateway_payload)
                )
            self.repo.update_transaction(tx)

            self._send_installment_success_notification(applicant, tx)

        return {"status": "success", "transaction_id": tx.id}

    def get_stage2_monitoring(
        self,
        wave_id: str | None,
        status_filter: str | None,
        search: str | None,
        page: int,
        per_page: int,
    ) -> dict:
        from sqlalchemy import or_, select

        # Scope halaman operasional admin = seluruh gelombang dalam periode aktif.
        # Tanpa periode aktif, tidak ada data (bukan lintas periode).
        active_period = get_active_period_info(self.repo.db)
        if not active_period:
            return {
                "data": [],
                "total": 0,
                "page": page,
                "per_page": per_page,
                "active_period": None,
                "summary": {
                    "total_applicants": 0,
                    "lunas_count": 0,
                    "belum_lunas_count": 0,
                    "belum_dp_count": 0,
                    "total_obligation_sum": 0,
                    "total_paid_sum": 0,
                    "total_remaining_sum": 0,
                },
            }

        query = (
            select(PPDBApplicant)
            .join(PPDBWave, PPDBApplicant.wave_id == PPDBWave.id)
            .where(
                PPDBWave.period_id == active_period["id"],
                PPDBApplicant.status == "passed",
                PPDBApplicant.deleted_at.is_(None),
            )
        )
        if wave_id:
            query = query.where(PPDBApplicant.wave_id == wave_id)

        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    PPDBApplicant.full_name.ilike(search_term),
                    PPDBApplicant.registration_number.ilike(search_term),
                    PPDBApplicant.phone.ilike(search_term),
                )
            )

        applicants = list(
            self.repo.db.scalars(query.order_by(PPDBApplicant.created_at.desc())).all()
        )

        results = []
        lunas_count = 0
        belum_lunas_count = 0
        belum_dp_count = 0
        total_obligation_sum = 0
        total_paid_sum = 0
        total_remaining_sum = 0

        for app in applicants:
            fin = self.calculate_applicant_financials(app.id)
            wave = self.repo.get_wave_by_id(app.wave_id) if app.wave_id else None

            overall_status = (
                "lunas"
                if fin["is_lunas"]
                else ("belum_lunas" if fin["dp_paid"] else "belum_dp")
            )

            if overall_status == "lunas":
                lunas_count += 1
            elif overall_status == "belum_lunas":
                belum_lunas_count += 1
            else:
                belum_dp_count += 1

            total_obligation_sum += fin["total_obligation"]
            total_paid_sum += fin["total_paid"]
            total_remaining_sum += fin["remaining_balance"]

            if (
                status_filter
                and status_filter != "all"
                and overall_status != status_filter
            ):
                continue

            results.append(
                {
                    "applicant_id": app.id,
                    "user_id": app.user_id,
                    "full_name": app.full_name,
                    "registration_number": (
                        app.registration_number or app.id[:8].upper()
                    ),
                    "phone": app.phone,
                    "wave_id": app.wave_id,
                    "wave_name": wave.name if wave else "-",
                    "is_loa_signed": app.is_loa_signed,
                    "dp_status": "paid" if fin["dp_paid"] else "pending",
                    "dp_paid_at": fin["dp_paid_at"],
                    "total_obligation": fin["total_obligation"],
                    "total_paid": fin["total_paid"],
                    "remaining_balance": fin["remaining_balance"],
                    "installments_count": fin["successful_installments_count"],
                    "is_lunas": fin["is_lunas"],
                    "overall_status": overall_status,
                }
            )

        total_filtered = len(results)
        offset = (page - 1) * per_page
        paged_data = results[offset : offset + per_page]

        return {
            "data": paged_data,
            "total": total_filtered,
            "page": page,
            "per_page": per_page,
            "active_period": active_period,
            "summary": {
                "total_applicants": len(applicants),
                "lunas_count": lunas_count,
                "belum_lunas_count": belum_lunas_count,
                "belum_dp_count": belum_dp_count,
                "total_obligation_sum": total_obligation_sum,
                "total_paid_sum": total_paid_sum,
                "total_remaining_sum": total_remaining_sum,
            },
        }

    def get_applicant_transactions(self, applicant_id: str) -> dict:
        applicant = self.repo.get_applicant_by_id(applicant_id)
        if not applicant:
            raise HTTPException(status_code=404, detail="Applicant not found")

        txs = self.repo.get_applicant_transactions(applicant_id)
        financials = self.calculate_applicant_financials(applicant_id)

        wave = (
            self.repo.get_wave_by_id(applicant.wave_id) if applicant.wave_id else None
        )
        formatted_txs = [self._format_transaction_response(t, applicant) for t in txs]
        return {
            "applicant_id": applicant_id,
            "applicant": {
                "id": applicant.id,
                "full_name": applicant.full_name,
                "registration_number": applicant.registration_number,
                "phone": applicant.phone,
                "email": applicant.email,
                "wave_id": applicant.wave_id,
                "wave_name": wave.name if wave else None,
                "is_loa_signed": applicant.is_loa_signed,
                "loa_signed_at": applicant.loa_signed_at.isoformat()
                if applicant.loa_signed_at
                else None,
                "dp_status": applicant.dp_status,
                "dp_paid_at": applicant.dp_paid_at.isoformat()
                if applicant.dp_paid_at
                else None,
                "status": applicant.status,
            },
            "financials": financials,
            "transactions": formatted_txs,
        }

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

    def process_pakkasir_webhook(
        self, payload: dict, x_secret: str | None = None
    ) -> dict:
        """
        Webhook 1 Pintu QRIS Pak Kasir v2 untuk verifikasi real-time.
        Mendukung verifikasi header X-Secret, penanganan formulir, DP,
        dan cicilan Tahap 2, idempotensi, serta rekonsiliasi pembayaran
        terlambat.
        """
        logger.info("Menerima webhook Pakasir: %s", payload)

        if settings.pakasir_webhook_secret:
            if not x_secret or not hmac.compare_digest(
                x_secret, settings.pakasir_webhook_secret
            ):
                logger.warning(
                    "Webhook Pakasir ditolak: X-Secret tidak valid atau tidak cocok"
                )
                raise HTTPException(
                    status_code=401, detail="Header X-Secret tidak valid"
                )
        elif settings.is_production:
            # Fail-closed: production tidak boleh memproses webhook tanpa secret.
            logger.error(
                "PAKASIR_WEBHOOK_SECRET belum dikonfigurasi — webhook ditolak "
                "di mode production."
            )
            raise HTTPException(
                status_code=503,
                detail="Webhook pembayaran belum dikonfigurasi dengan aman",
            )
        else:
            logger.warning(
                "PAKASIR_WEBHOOK_SECRET kosong — memproses webhook tanpa "
                "validasi secret (hanya non-production)."
            )

        order_id = (
            payload.get("order_id")
            or payload.get("invoice_id")
            or payload.get("external_id")
            or payload.get("id")
        )
        # 'transaction_id' pada sebagian gateway berarti order_id kita — jangan
        # menganggapnya sebagai txn_id provider.
        if not order_id:
            order_id = payload.get("transaction_id")
        txn_id = payload.get("txn_id")
        amount = payload.get("amount")
        status = str(
            payload.get("status")
            or payload.get("transaction_status")
            or payload.get("payment_status")
            or ""
        ).lower()

        tx = None
        if order_id:
            tx = (
                self.repo.get_transaction_by_id(str(order_id))
                or self.repo.get_transaction_by_order_id(str(order_id))
                or self.repo.get_transaction_by_external_id(str(order_id))
            )
        if not tx and txn_id:
            tx = self.repo.get_transaction_by_txn_id(str(txn_id))

        if not tx:
            logger.warning(
                "Transaksi Pakasir tidak ditemukan untuk order_id=%s, txn_id=%s",
                order_id,
                txn_id,
            )
            raise HTTPException(
                status_code=404, detail="Transaction not found for this payment"
            )

        # Anti salah-pasang: identitas dari provider harus konsisten dengan
        # transaksi yang ditemukan. JANGAN memakai applicant_id dari payload
        # sebagai fallback (dapat memasangkan callback ke transaksi lain).
        if txn_id and tx.txn_id and str(txn_id) != str(tx.txn_id):
            logger.warning(
                "Webhook txn_id tidak cocok untuk tx %s: payload=%s, db=%s",
                tx.id,
                txn_id,
                tx.txn_id,
            )
            raise HTTPException(
                status_code=400,
                detail="txn_id webhook tidak cocok dengan transaksi",
            )
        if order_id:
            allowed_refs = {
                str(ref) for ref in (tx.id, tx.order_id, tx.external_id) if ref
            }
            if allowed_refs and str(order_id) not in allowed_refs:
                logger.warning(
                    "Webhook order_id tidak cocok untuk tx %s: payload=%s",
                    tx.id,
                    order_id,
                )
                raise HTTPException(
                    status_code=400,
                    detail="order_id webhook tidak cocok dengan transaksi",
                )

        # Cek idempotensi: jika sudah sukses sebelumnya, langsung return sukses
        if tx.status in ("success", "paid"):
            logger.info("Transaksi %s sudah lunas sebelumnya (idempoten)", tx.id)
            return {
                "success": True,
                "message": "Transaksi sudah tercatat lunas sebelumnya",
                "status": "already_paid",
                "transaction_id": tx.id,
            }

        # Validasi nominal jika disediakan
        if amount is not None:
            try:
                amt_int = int(amount)
                if amt_int != tx.amount:
                    logger.warning(
                        "Webhook nominal tidak cocok untuk tx %s: DB=%s, Payload=%s",
                        tx.id,
                        tx.amount,
                        amt_int,
                    )
                    tx.notes = (
                        "[ANOMALI WEBHOOK] Nominal tidak cocok: "
                        f"DB={tx.amount}, Payload={amt_int}"
                    )
                    self.repo.update_transaction(tx)
                    raise HTTPException(
                        status_code=400,
                        detail="Nominal webhook tidak cocok dengan tagihan",
                    )
            except (ValueError, TypeError):
                pass

        now_wib = datetime.now(WIB)
        provider_state = canonical_status(status)
        is_success = provider_state == STATUS_COMPLETED
        is_failed = provider_state == STATUS_CANCELED

        if is_success:
            res = self._settle_successful_transaction(tx, gateway_payload=payload)
            return {
                "success": True,
                "message": "Pembayaran berhasil diverifikasi",
                "status": res.get("status", "success"),
                "transaction_id": tx.id,
            }
        elif is_failed:
            tx.status = (
                "cancelled"
                if status in ("canceled", "cancelled", "batal")
                else "failed"
            )
            tx.provider_status = status
            tx.failure_reason = payload.get("failure_reason") or f"Status: {status}"
            tx.updated_at = now_wib
            self.repo.update_transaction(tx)
            return {"success": True, "status": tx.status, "transaction_id": tx.id}

        return {
            "success": True,
            "message": f"Webhook diterima dengan status: {status}",
            "transaction_id": tx.id,
        }

    def process_webhook(self, payload: dict, x_secret: str | None = None) -> dict:
        return self.process_pakkasir_webhook(payload, x_secret=x_secret)

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

        return {"success": True, "discounts_saved": saved, "bills_generated": generated}

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

        return {
            "bills": bills,
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
            from src.models.ppdb import PPDBPeriod, PPDBWave

            applicant = self.repo.get_applicant_by_id(bill.applicant_id)
            if applicant:
                wave = (
                    self.repo.db.get(PPDBWave, applicant.wave_id)
                    if applicant.wave_id
                    else None
                )
                period = (
                    self.repo.db.get(PPDBPeriod, wave.period_id)
                    if wave and wave.period_id
                    else None
                )
                wa_link = (
                    period.wa_group_link
                    if period and period.wa_group_link
                    else f"{settings.ppdb_frontend_url}/dashboard"
                )

                send_notification(
                    "dp_payment_success",
                    applicant.user_id,
                    {
                        "nama_sekolah": (
                            "Pesantren Tahfidz Qur'an dan Digital Ar-Rahman"
                        ),
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
