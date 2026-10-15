from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

from src.core.config import settings
from src.core.pakasir import PakasirClient
from src.core.scheduler import run_installment_reminders
from src.models.ppdb import (
    PPDBApplicant,
    PPDBPaymentTransaction,
    PPDBWave,
)
from src.services.payment_service import (
    PaymentService,
    create_secure_doc_token,
    verify_secure_doc_token,
)

WIB = ZoneInfo("Asia/Jakarta")


class MockDb:
    def __init__(self):
        self.items = []
        self.added = []
        self.committed = False

    def add(self, item):
        self.added.append(item)
        if item not in self.items:
            self.items.append(item)

    def commit(self):
        self.committed = True

    def get(self, model, ident):
        for item in self.items:
            if isinstance(item, model) and getattr(item, "id", None) == ident:
                return item
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 1. Pakasir v2 Client Tests
# ─────────────────────────────────────────────────────────────────────────────


def test_pakasir_client_create_transaction():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "message": "Transaksi berhasil dibuat",
            "data": {
                "txn_id": "tx_12345",
                "order_id": "PPDB-DP-12345",
                "amount": 5000000,
                "qr_string": "000201010212...",
                "expired_at": "2026-10-14 20:00:00",
            },
        }
        mock_post.return_value = mock_resp

        res = client.create_transaction("PPDB-DP-12345", 5000000)
        assert res["status"] == "success"
        assert res["data"]["txn_id"] == "tx_12345"
        assert res["data"]["amount"] == 5000000
        # Verify headers and URL
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "api/v2/create-transaction/arrahman/PPDB-DP-12345" in args[0]
        assert kwargs["headers"]["X-Api-Key"] == "secret-key"
        assert kwargs["json"] == {"method": "qris", "amount": 5000000}


def test_pakasir_client_status_and_cancel():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.get") as mock_get, patch("httpx.Client.post") as mock_post:
        # Status
        mock_resp_get = MagicMock()
        mock_resp_get.status_code = 200
        mock_resp_get.json.return_value = {
            "status": "success",
            "data": {
                "txn_id": "tx_12345",
                "order_id": "PPDB-DP-12345",
                "status": "completed",
            },
        }
        mock_get.return_value = mock_resp_get

        st = client.get_transaction_status("tx_12345")
        assert st["data"]["status"] == "completed"

        # Cancel
        mock_resp_post = MagicMock()
        mock_resp_post.status_code = 200
        mock_resp_post.json.return_value = {
            "status": "success",
            "message": "Berhasil batalkan transaksi",
        }
        mock_post.return_value = mock_resp_post

        c = client.cancel_transaction("tx_12345")
        assert c["status"] == "success"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Financial Calculations & Business Rule Checks
# ─────────────────────────────────────────────────────────────────────────────


def test_financial_calculation_and_lunas_status():
    mock_repo = MagicMock()
    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        wave_id="w-1",
        status="passed",
        is_loa_signed=True,
        dp_status="paid",
    )
    wave = PPDBWave(
        id="w-1",
        minimum_dp=5000000,
        second_stage_fee=15000000,
        early_discount_quota=0,
    )
    mock_repo.get_applicant_by_id.return_value = app
    mock_repo.get_wave_by_id.return_value = wave
    mock_repo.get_paid_form_payment_rank.return_value = None
    mock_repo.get_wave_fee_items_with_discounts.return_value = [
        {"name": "Biaya DP3 & SPP", "final_amount": 15000000}
    ]

    # Scenario A: DP paid, 0 installments -> remaining 10,000,000, not lunas
    dp_tx = PPDBPaymentTransaction(
        id="tx-dp",
        applicant_id="app-1",
        payment_type="dp",
        status="success",
        amount=5000000,
    )
    mock_repo.get_applicant_transactions.return_value = [dp_tx]

    service = PaymentService(mock_repo)
    fin = service.calculate_applicant_financials("app-1")
    assert fin["total_obligation"] == 15000000
    assert fin["dp_paid"] is True
    assert fin["dp_amount_paid"] == 5000000
    assert fin["total_paid"] == 5000000
    assert fin["remaining_balance"] == 10000000
    assert fin["is_lunas"] is False

    # Scenario B: DP paid + Installment 1 (Rp 5,000,000)
    # + Installment 2 (Rp 5,000,000) -> LUNAS
    inst_1 = PPDBPaymentTransaction(
        id="tx-i1",
        applicant_id="app-1",
        payment_type="installment",
        status="success",
        amount=5000000,
        installment_number=1,
    )
    inst_2 = PPDBPaymentTransaction(
        id="tx-i2",
        applicant_id="app-1",
        payment_type="installment",
        status="success",
        amount=5000000,
        installment_number=2,
    )
    mock_repo.get_applicant_transactions.return_value = [dp_tx, inst_1, inst_2]

    fin_lunas = service.calculate_applicant_financials("app-1")
    assert fin_lunas["total_paid"] == 15000000
    assert fin_lunas["remaining_balance"] == 0
    assert fin_lunas["is_lunas"] is True
    assert fin_lunas["successful_installments_count"] == 2


def test_qris_creation_validations_dp_and_installment():
    mock_repo = MagicMock()
    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        wave_id="w-1",
        status="passed",
        is_loa_signed=False,  # Not signed yet
        dp_status="pending",
    )
    wave = PPDBWave(
        id="w-1",
        minimum_dp=5000000,
        second_stage_fee=15000000,
        quota=100,
    )
    mock_repo.get_applicant_by_user_id.return_value = app
    mock_repo.get_applicant_by_id.return_value = app
    mock_repo.get_wave_by_id.return_value = wave
    mock_repo.get_active_transaction.return_value = None
    mock_repo.get_applicant_transactions.return_value = []
    mock_repo.get_wave_fee_items_with_discounts.return_value = []

    service = PaymentService(mock_repo)

    # 1. DP requires LoA signed
    with pytest.raises(HTTPException) as exc:
        service.create_qris_transaction("u-1", payment_type="dp")
    assert "Dokumen LoA harus ditandatangani" in str(exc.value.detail)

    # 2. Stage 2 requires DP paid first
    app.is_loa_signed = True
    with pytest.raises(HTTPException) as exc:
        service.create_qris_transaction(
            "u-1", payment_type="installment", amount=1000000
        )
    assert "Pembayaran DP harus diselesaikan" in str(exc.value.detail)

    # 3. When DP is paid, cannot exceed remaining balance
    dp_tx = PPDBPaymentTransaction(
        id="tx-dp",
        applicant_id="app-1",
        payment_type="dp",
        status="success",
        amount=5000000,
    )
    app.dp_status = "paid"
    mock_repo.get_applicant_transactions.return_value = [dp_tx]

    # Remaining is 10,000,000. Trying to pay 12,000,000 must fail:
    with pytest.raises(HTTPException) as exc:
        service.create_qris_transaction(
            "u-1", payment_type="installment", amount=12000000
        )
    assert "melebihi sisa tagihan" in str(exc.value.detail)


def test_active_transaction_restoration_on_reload():
    mock_repo = MagicMock()
    app = PPDBApplicant(
        id="app-1", user_id="u-1", wave_id="w-1", status="passed", is_loa_signed=True
    )
    future_time = datetime.now(WIB) + timedelta(minutes=10)
    active_tx = PPDBPaymentTransaction(
        id="tx-active",
        applicant_id="app-1",
        order_id="PPDB-DP-APP1-12345",
        txn_id="tx_gw_123",
        payment_type="dp",
        amount=5000000,
        status="pending",
        provider_status="pending",
        qr_string="000201...",
        expired_at=future_time,
    )
    mock_repo.get_applicant_by_user_id.return_value = app
    mock_repo.get_active_transaction.return_value = active_tx

    service = PaymentService(mock_repo)
    # Calling create_qris_transaction with same payment_type returns
    # existing active without duplicate
    res = service.create_qris_transaction("u-1", payment_type="dp")
    assert res["id"] == "tx-active"
    assert res["status"] == "pending"
    assert res["expires_in_seconds"] > 0
    # ensure no new transaction saved
    mock_repo.save_transaction.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Webhook Security & Atomic Sequential Numbering
# ─────────────────────────────────────────────────────────────────────────────


def test_webhook_secret_validation():
    mock_repo = MagicMock()
    service = PaymentService(mock_repo)

    with patch.object(settings, "pakasir_webhook_secret", "correct-secret"):
        # Without secret or wrong secret -> 401
        with pytest.raises(HTTPException) as exc:
            service.process_pakkasir_webhook(
                {"order_id": "123"}, x_secret="wrong-secret"
            )
        assert exc.value.status_code == 401


def test_sequential_atomic_installment_numbering():
    mock_repo = MagicMock()
    mock_db = MockDb()
    mock_repo.db = mock_db

    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        wave_id="w-1",
        status="passed",
        is_loa_signed=True,
        dp_status="paid",
    )
    wave = PPDBWave(id="w-1", minimum_dp=5000000, second_stage_fee=15000000)
    mock_repo.get_applicant_by_id.return_value = app
    mock_repo.get_wave_by_id.return_value = wave
    mock_repo.get_wave_fee_items_with_discounts.return_value = []

    # Suppose there are already 2 successful installments
    mock_repo.count_successful_installments.return_value = 2

    # New pending installment transaction being confirmed
    tx = PPDBPaymentTransaction(
        id="tx-inst-3",
        applicant_id="app-1",
        order_id="PPDB-INST-APP1-3333",
        payment_type="installment",
        status="pending",
        amount=3000000,
    )
    mock_repo.get_transaction_by_id.return_value = None
    mock_repo.get_transaction_by_order_id.return_value = tx
    mock_repo.get_applicant_transactions.return_value = [
        PPDBPaymentTransaction(
            id="tx-dp",
            applicant_id="app-1",
            payment_type="dp",
            status="success",
            amount=5000000,
        ),
        PPDBPaymentTransaction(
            id="tx-i1",
            applicant_id="app-1",
            payment_type="installment",
            status="success",
            amount=2000000,
        ),
        PPDBPaymentTransaction(
            id="tx-i2",
            applicant_id="app-1",
            payment_type="installment",
            status="success",
            amount=2000000,
        ),
    ]

    service = PaymentService(mock_repo)
    with patch.object(service, "_send_installment_success_notification"):
        res = service.process_pakkasir_webhook(
            {
                "order_id": "PPDB-INST-APP1-3333",
                "status": "completed",
                "amount": 3000000,
            }
        )

    assert res["success"] is True
    assert tx.status == "success"
    # Atomic sequential numbering check: exactly 2 + 1 = 3!
    assert tx.installment_number == 3
    # Check financial snapshot was stamped
    assert tx.total_obligation == 15000000
    assert tx.total_paid_before == 9000000  # 5M DP + 4M installments
    assert tx.remaining_before == 6000000
    assert tx.total_paid_after == 12000000
    assert tx.remaining_after == 3000000
    assert tx.receipt_number.startswith("KUI-PPDB-")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Kuitansi & HMAC Signed URLs
# ─────────────────────────────────────────────────────────────────────────────


def test_immutable_receipt_and_secure_tokens():
    mock_repo = MagicMock()
    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        full_name="Muhammad Fatih",
        registration_number="REG-2026-001",
    )
    tx_success = PPDBPaymentTransaction(
        id="12345678-1234-5678-1234-567812345678",
        applicant_id="app-1",
        order_id="PPDB-INST-001",
        payment_type="installment",
        installment_number=1,
        amount=2500000,
        status="success",
        total_obligation=15000000,
        total_paid_before=5000000,
        remaining_before=10000000,
        total_paid_after=7500000,
        remaining_after=7500000,
        receipt_number="KUI-PPDB-123456781234",
    )
    tx_pending = PPDBPaymentTransaction(
        id="tx-pending-1",
        applicant_id="app-1",
        status="pending",
    )

    mock_repo.get_transaction_by_id.side_effect = (
        lambda tid: tx_success if tid == tx_success.id else tx_pending
    )
    mock_repo.get_applicant_by_id.return_value = app
    mock_repo.get_wave_by_id.return_value = None

    service = PaymentService(mock_repo)

    # 1. Generate HMAC token
    token = create_secure_doc_token("receipt", tx_success.id, exp_hours=24)
    verified_id = verify_secure_doc_token(token, "receipt")
    assert verified_id == tx_success.id

    # 2. Accessing receipt with valid token works
    receipt = service.get_receipt(tx_success.id, token=token)
    assert receipt["receipt_no"] == "KUI-PPDB-123456781234"
    assert receipt["applicant_name"] == "Muhammad Fatih"
    assert receipt["financial_snapshot"]["total_obligation"] == 15000000
    assert receipt["financial_snapshot"]["remaining_after"] == 7500000

    # 3. Pending/failed transaction strictly rejected
    with pytest.raises(HTTPException) as exc:
        service.get_receipt(tx_pending.id, user_id="u-1")
    assert "hanya tersedia untuk transaksi yang sudah terverifikasi sukses" in str(
        exc.value.detail
    )

    # 4. Tampered token rejected
    tampered_token = token[:-5] + "XXXXX"
    with pytest.raises(HTTPException) as exc:
        verify_secure_doc_token(tampered_token, "receipt")
    assert exc.value.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# 5. Background Scheduler & Asia/Jakarta Idempotency
# ─────────────────────────────────────────────────────────────────────────────


def test_installment_reminder_scheduler_logic():
    mock_db = MagicMock()
    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        full_name="Ahmad Santri",
        status="passed",
        dp_status="paid",
    )
    mock_db.scalars.return_value.all.return_value = [app]

    with (
        patch(
            "src.services.payment_service.PaymentService.calculate_applicant_financials"
        ) as mock_calc,
        patch("src.core.scheduler.send_notification") as mock_notif,
    ):
        mock_calc.return_value = {
            "dp_paid": True,
            "is_lunas": False,
            "remaining_balance": 5000000,
            "total_obligation": 15000000,
            "total_paid": 10000000,
        }

        # Run scheduler job with db=mock_db and force=True
        stats = run_installment_reminders(db=mock_db, dry_run=False, force=True)
        assert stats["sent"] == 1
        assert stats["total_eligible"] == 1
        mock_notif.assert_called_once()
