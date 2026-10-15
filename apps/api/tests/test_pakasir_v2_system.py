"""Tests for the Pakasir API v2 integration.

Mocks in this file mirror the *real* provider responses (flat JSON, per the v2
docs), not the shape the implementation happens to read. Coverage is grouped:

1. Client normalization (flat + `data`-wrapped + invalid + error paths).
2. Financial calculations & business rule checks.
3. create-transaction integration (required fields, reconciliation markers).
4. Webhook security (secret, identity matching, amount, idempotency).
5. Status sync & cancel (local countdown must not fabricate expiry).
6. Kuitansi & HMAC signed URLs.
7. Background scheduler & Asia/Jakarta idempotency.
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

from src.core.config import settings
from src.core.pakasir import (
    PakasirClient,
    PakasirError,
    PakasirUncertainError,
    normalize_create_response,
    normalize_status_response,
)
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
# 1. Pakasir v2 Client Tests — normalization of REAL provider responses
# ─────────────────────────────────────────────────────────────────────────────

# Flat create-transaction payload exactly as documented for Pakasir v2.
FLAT_CREATE_RESPONSE = {
    "txn_id": "vwiqpcriq",
    "project": "arrahman",
    "order_id": "PPDB-DP-12345",
    "amount": 5000000,
    "fee": 35000,
    "total_payment": 5035000,
    "payment_method": "qris",
    "qr_string": "00020101021226610016ID.CO.QRIS.WWW...",
    "va_number": None,
    "expired_at": "2026-10-14T20:00:00+07:00",
    "is_sandbox": False,
}


def test_client_create_transaction_flat_response():
    """Provider mengembalikan JSON datar (tanpa pembungkus `data`)."""
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "{}"
        mock_resp.json.return_value = dict(FLAT_CREATE_RESPONSE)
        mock_post.return_value = mock_resp

        res = client.create_transaction("PPDB-DP-12345", 5000000)

        assert res.txn_id == "vwiqpcriq"
        assert res.order_id == "PPDB-DP-12345"
        assert res.amount == 5000000
        assert res.total_payment == 5035000
        assert res.qr_string == FLAT_CREATE_RESPONSE["qr_string"]
        assert res.expired_at == "2026-10-14T20:00:00+07:00"
        assert res.is_sandbox is False

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert "api/v2/create-transaction/arrahman/PPDB-DP-12345" in args[0]
        assert kwargs["headers"]["X-Api-Key"] == "secret-key"
        assert kwargs["json"] == {"method": "qris", "amount": 5000000}


def test_client_create_transaction_accepts_data_wrapper():
    """Kompatibilitas: respons yang dibungkus `data` tetap dinormalisasi."""
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "{}"
        mock_resp.json.return_value = {
            "status": "success",
            "data": dict(FLAT_CREATE_RESPONSE),
        }
        mock_post.return_value = mock_resp

        res = client.create_transaction("PPDB-DP-12345", 5000000)
        assert res.txn_id == "vwiqpcriq"
        assert res.qr_string == FLAT_CREATE_RESPONSE["qr_string"]


def test_normalize_create_response_missing_txn_id_is_uncertain():
    with pytest.raises(PakasirUncertainError):
        normalize_create_response(
            {"order_id": "PPDB-DP-1", "amount": 1000, "qr_string": "x"}
        )


def test_normalize_create_response_non_object_is_uncertain():
    with pytest.raises(PakasirUncertainError):
        normalize_create_response(["not", "a", "dict"])


def test_client_create_transaction_http_4xx_is_definitive_error():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "invalid amount"
        mock_post.return_value = mock_resp

        with pytest.raises(PakasirError) as exc:
            client.create_transaction("PPDB-DP-12345", 5000000)
        assert not isinstance(exc.value, PakasirUncertainError)


def test_client_create_transaction_5xx_is_uncertain_error():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_resp.text = "service unavailable"
        mock_post.return_value = mock_resp

        with pytest.raises(PakasirUncertainError):
            client.create_transaction("PPDB-DP-12345", 5000000)


def test_client_status_flat_normalization():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = "{}"
        mock_resp.json.return_value = {
            "txn_id": "vwiqpcriq",
            "order_id": "PPDB-DP-12345",
            "amount": 5000000,
            "is_sandbox": False,
            "status": "completed",
            "completed_at": "2026-10-14T19:05:00+07:00",
        }
        mock_get.return_value = mock_resp

        st = client.get_transaction_status("vwiqpcriq")
        assert st.status == "completed"
        assert st.provider_status == "completed"
        assert st.txn_id == "vwiqpcriq"
        assert st.completed_at == "2026-10-14T19:05:00+07:00"


def test_normalize_status_response_missing_status_is_uncertain():
    with pytest.raises(PakasirUncertainError):
        normalize_status_response({"txn_id": "abc", "order_id": "x"})


def test_client_cancel_confirmed_and_empty_body_uncertain():
    client = PakasirClient(slug="arrahman", api_key="secret-key")
    with patch("httpx.Client.post") as mock_post:
        ok = MagicMock()
        ok.status_code = 200
        ok.text = "{}"
        ok.json.return_value = {"message": "Berhasil batalkan transaksi"}
        mock_post.return_value = ok
        res = client.cancel_transaction("vwiqpcriq")
        assert res.confirmed is True
        assert "Berhasil" in res.message

        empty = MagicMock()
        empty.status_code = 200
        empty.text = "{}"
        empty.json.return_value = {}
        mock_post.return_value = empty
        res2 = client.cancel_transaction("vwiqpcriq")
        assert res2.confirmed is False


def test_sandbox_mock_blocked_in_production():
    """Production tanpa API key harus gagal, bukan diam-diam memakai sandbox."""
    with (
        patch.object(settings, "app_env", "production"),
        patch.object(settings, "pakasir_api_key", ""),
    ):
        client = PakasirClient(slug="arrahman", api_key="")
        with pytest.raises(PakasirError) as exc:
            client.create_transaction("PPDB-DP-12345", 5000000)
        assert not isinstance(exc.value, PakasirUncertainError)


def test_sandbox_mock_allowed_in_development():
    with (
        patch.object(settings, "app_env", "development"),
        patch.object(settings, "pakasir_api_key", ""),
    ):
        client = PakasirClient(slug="arrahman", api_key="")
        res = client.create_transaction("PPDB-DP-12345", 5000000)
        assert res.is_sandbox is True
        assert res.txn_id
        assert res.qr_string


def test_credentials_are_redacted_from_error_details():
    with patch.object(settings, "pakasir_api_key", "SUPERSECRET"):
        client = PakasirClient(slug="arrahman", api_key="SUPERSECRET")
        with patch("httpx.Client.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 400
            mock_resp.text = "bad key SUPERSECRET rejected"
            mock_post.return_value = mock_resp

            with pytest.raises(PakasirError) as exc:
                client.create_transaction("PPDB-DP-12345", 5000000)
            assert "SUPERSECRET" not in (exc.value.details or "")


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
# 3. create-transaction integration — never persist an unpayable pending row
# ─────────────────────────────────────────────────────────────────────────────


def _form_service(mock_repo):
    app = PPDBApplicant(
        id="app-1",
        user_id="u-1",
        wave_id="w-1",
        status="pending_payment",
        payment_status="pending",
    )
    wave = PPDBWave(id="w-1", registration_fee=250000, quota=0)
    mock_repo.get_applicant_by_user_id.return_value = app
    mock_repo.get_applicant_by_id.return_value = app
    mock_repo.get_wave_by_id.return_value = wave
    mock_repo.get_active_transaction.return_value = None
    mock_repo.count_paid_form_payments_in_wave.return_value = 0
    return PaymentService(mock_repo)


def _created_result(txn_id="tx_1", qr_string="000201..."):
    from src.core.pakasir import CreateTransactionResult

    return CreateTransactionResult(
        txn_id=txn_id,
        order_id="PPDB-FORM-APP1-ABCDEF",
        amount=250000,
        fee=0,
        total_payment=250000,
        payment_method="qris",
        qr_string=qr_string,
        payment_link=None,
        va_number=None,
        expired_at=None,
        is_sandbox=False,
        raw={},
    )


def test_create_qris_uncertain_response_saves_pending_verification():
    mock_repo = MagicMock()
    service = _form_service(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.create_transaction.side_effect = PakasirUncertainError(
            "timeout ke gateway"
        )
        with pytest.raises(HTTPException) as exc:
            service.create_qris_transaction("u-1", payment_type="form")
        assert exc.value.status_code == 502

    saved = mock_repo.save_transaction.call_args[0][0]
    assert saved.status == "pending_verification"
    assert saved.txn_id is None
    assert saved.order_id  # tetap terlacak untuk rekonsiliasi


def test_create_qris_missing_qr_saves_pending_verification():
    mock_repo = MagicMock()
    service = _form_service(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.create_transaction.return_value = _created_result(
            txn_id="tx_1", qr_string=None
        )
        with pytest.raises(HTTPException) as exc:
            service.create_qris_transaction("u-1", payment_type="form")
        assert exc.value.status_code == 502

    saved = mock_repo.save_transaction.call_args[0][0]
    assert saved.status == "pending_verification"
    assert saved.txn_id == "tx_1"  # txn_id tetap disimpan untuk sync status
    assert saved.qr_string is None


def test_create_qris_valid_response_persists_pending_with_qr():
    mock_repo = MagicMock()
    service = _form_service(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.create_transaction.return_value = _created_result()
        res = service.create_qris_transaction("u-1", payment_type="form")

    saved = mock_repo.save_transaction.call_args[0][0]
    assert saved.status == "pending"
    assert saved.txn_id == "tx_1"
    assert saved.qr_string == "000201..."
    assert res["qr_string"] == "000201..."
    assert res["status"] == "pending"


def test_create_qris_definitive_error_does_not_persist():
    mock_repo = MagicMock()
    service = _form_service(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.create_transaction.side_effect = PakasirError(
            "Gateway menolak pembuatan transaksi (400)"
        )
        with pytest.raises(HTTPException) as exc:
            service.create_qris_transaction("u-1", payment_type="form")
        assert exc.value.status_code == 502

    mock_repo.save_transaction.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# 4. Webhook Security & Identity Matching
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


def test_webhook_rejected_without_secret_in_production():
    mock_repo = MagicMock()
    service = PaymentService(mock_repo)

    with (
        patch.object(settings, "pakasir_webhook_secret", ""),
        patch.object(settings, "app_env", "production"),
    ):
        with pytest.raises(HTTPException) as exc:
            service.process_pakkasir_webhook({"order_id": "123"})
        assert exc.value.status_code == 503


def test_webhook_does_not_fall_back_to_applicant_id():
    """Callback tanpa order_id/txn_id yang cocok TIDAK boleh dipasangkan
    hanya karena payload memuat applicant_id (mencegah salah-pasang)."""
    mock_repo = MagicMock()
    mock_repo.get_transaction_by_id.return_value = None
    mock_repo.get_transaction_by_order_id.return_value = None
    mock_repo.get_transaction_by_external_id.return_value = None
    mock_repo.get_transaction_by_txn_id.return_value = None
    service = PaymentService(mock_repo)

    with patch.object(settings, "pakasir_webhook_secret", ""):
        with pytest.raises(HTTPException) as exc:
            service.process_pakkasir_webhook(
                {"applicant_id": "app-1", "status": "completed", "amount": 250000}
            )
        assert exc.value.status_code == 404
    mock_repo.get_latest_transaction_by_applicant_id.assert_not_called()


def test_webhook_txn_id_mismatch_rejected():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-1",
        applicant_id="app-1",
        order_id="PPDB-FORM-1",
        txn_id="txn-correct",
        status="pending",
        amount=250000,
    )
    mock_repo.get_transaction_by_id.return_value = None
    mock_repo.get_transaction_by_order_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch.object(settings, "pakasir_webhook_secret", ""):
        with pytest.raises(HTTPException) as exc:
            service.process_pakkasir_webhook(
                {
                    "order_id": "PPDB-FORM-1",
                    "txn_id": "txn-other",
                    "status": "completed",
                    "amount": 250000,
                }
            )
        assert exc.value.status_code == 400


def test_webhook_amount_mismatch_rejected():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-1",
        applicant_id="app-1",
        order_id="PPDB-FORM-1",
        txn_id="txn-1",
        status="pending",
        amount=250000,
    )
    mock_repo.get_transaction_by_id.return_value = None
    mock_repo.get_transaction_by_order_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch.object(settings, "pakasir_webhook_secret", ""):
        with pytest.raises(HTTPException) as exc:
            service.process_pakkasir_webhook(
                {
                    "order_id": "PPDB-FORM-1",
                    "txn_id": "txn-1",
                    "status": "completed",
                    "amount": 999999,
                }
            )
        assert exc.value.status_code == 400


def test_webhook_idempotent_for_already_paid():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-1",
        applicant_id="app-1",
        order_id="PPDB-FORM-1",
        txn_id="txn-1",
        status="success",
        amount=250000,
    )
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch.object(settings, "pakasir_webhook_secret", ""):
        res = service.process_pakkasir_webhook(
            {
                "order_id": "PPDB-FORM-1",
                "txn_id": "txn-1",
                "status": "completed",
                "amount": 250000,
            }
        )
    assert res["success"] is True
    assert res.get("status") == "already_paid"
    mock_repo.update_transaction.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Status sync & cancel — local countdown must not fabricate expiry
# ─────────────────────────────────────────────────────────────────────────────


def _tx(status="pending", txn_id="txn-1", expired_at=None):
    return PPDBPaymentTransaction(
        id="tx-1",
        applicant_id="app-1",
        order_id="PPDB-FORM-1",
        txn_id=txn_id,
        payment_type="form",
        status=status,
        provider_status="pending",
        amount=250000,
        qr_string="000201...",
        expired_at=expired_at,
    )


def test_sync_status_provider_pending_does_not_expire_locally():
    """Countdown lokal sudah lewat tapi provider masih pending → status
    lokal dipertahankan (tidak diubah menjadi expired)."""
    mock_repo = MagicMock()
    past = datetime.now(WIB) - timedelta(minutes=30)
    tx = _tx(expired_at=past)
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    from src.core.pakasir import TransactionStatusResult

    pending = TransactionStatusResult(
        txn_id="txn-1",
        order_id="PPDB-FORM-1",
        amount=250000,
        status="pending",
        provider_status="pending",
        completed_at=None,
        is_sandbox=False,
        raw={},
    )
    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.get_transaction_status.return_value = pending
        res = service.sync_transaction_status("tx-1")

    assert tx.status == "pending"
    assert res["status"] == "pending"


def test_sync_status_completed_settles():
    mock_repo = MagicMock()
    tx = _tx()
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch.object(service, "_settle_successful_transaction") as mock_settle:

        def _settle(t, gateway_payload=None):
            t.status = "success"
            return {"status": "success"}

        mock_settle.side_effect = _settle
        mock_repo.reset_mock()
        mock_repo.get_transaction_by_id.return_value = tx

        from src.core.pakasir import TransactionStatusResult

        completed = TransactionStatusResult(
            txn_id="txn-1",
            order_id="PPDB-FORM-1",
            amount=250000,
            status="completed",
            provider_status="completed",
            completed_at=None,
            is_sandbox=False,
            raw={},
        )
        with patch("src.services.payment_service.get_pakasir_client") as mock_get:
            mock_get.return_value.get_transaction_status.return_value = completed
            res = service.sync_transaction_status("tx-1")

    assert res["status"] == "success"
    assert tx.status == "success"


def test_sync_status_uncertain_keeps_local_status():
    mock_repo = MagicMock()
    tx = _tx()
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.get_transaction_status.side_effect = (
            PakasirUncertainError("network down")
        )
        res = service.sync_transaction_status("tx-1")

    assert tx.status == "pending"
    assert res["status"] == "pending"


def test_sync_status_recovers_pending_verification_without_txn_id():
    mock_repo = MagicMock()
    tx = _tx(status="pending_verification", txn_id=None)
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.create_transaction.return_value = _created_result(
            txn_id="txn-recovered"
        )
        service.sync_transaction_status("tx-1")

    assert tx.txn_id == "txn-recovered"
    assert tx.status == "pending"
    assert tx.qr_string == "000201..."


def test_cancel_confirmed_updates_status():
    mock_repo = MagicMock()
    tx = _tx()
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    from src.core.pakasir import CancelTransactionResult

    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.cancel_transaction.return_value = CancelTransactionResult(
            confirmed=True, message="Berhasil batalkan transaksi", raw={}
        )
        res = service.cancel_transaction("tx-1")

    assert res["success"] is True
    assert tx.status == "cancelled"


def test_cancel_uncertain_does_not_mark_cancelled():
    """Pembatalan provider tidak pasti → jangan langsung set cancelled."""
    mock_repo = MagicMock()
    tx = _tx()
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    from src.core.pakasir import TransactionStatusResult

    pending = TransactionStatusResult(
        txn_id="txn-1",
        order_id="PPDB-FORM-1",
        amount=250000,
        status="pending",
        provider_status="pending",
        completed_at=None,
        is_sandbox=False,
        raw={},
    )
    with patch("src.services.payment_service.get_pakasir_client") as mock_get:
        mock_get.return_value.cancel_transaction.side_effect = PakasirUncertainError(
            "timeout"
        )
        mock_get.return_value.get_transaction_status.return_value = pending
        res = service.cancel_transaction("tx-1")

    assert res["success"] is False
    assert tx.status == "pending"
    assert tx.provider_status == "cancel_requested"


def test_cancel_without_txn_id_cancels_locally():
    mock_repo = MagicMock()
    tx = _tx(status="pending_verification", txn_id=None)
    mock_repo.get_transaction_by_id.return_value = tx
    service = PaymentService(mock_repo)

    res = service.cancel_transaction("tx-1")
    assert res["success"] is True
    assert tx.status == "cancelled"


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
# 6. Kuitansi & HMAC Signed URLs
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
# 7. Background Scheduler & Asia/Jakarta Idempotency
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
