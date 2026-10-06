"""Test late payment webhook exception handling according to
docs/REQUIREMENTS.md & AGENTS.md.

Aturan:
"Jika webhook sukses datang setelah tagihan dibatalkan (karena kuota penuh),
tandai sebagai pengecualian untuk pemeriksaan admin — jangan otomatis memindahkan
pendaftar ke gelombang lain atau langsung meluluskan tagihan."
"""

from unittest.mock import MagicMock

from src.models.ppdb import PPDBApplicant, PPDBPaymentTransaction
from src.services.payment_service import PaymentService


def test_normal_payment_webhook_marks_success():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-1",
        applicant_id="app-1",
        status="pending",
        amount=250000,
    )
    applicant = PPDBApplicant(
        id="app-1",
        user_id="user-1",
        wave_id="wave-1",
        status="pending_payment",
        payment_status="pending",
    )
    mock_repo.get_transaction_by_id.return_value = tx
    mock_repo.get_applicant_by_id.return_value = applicant

    service = PaymentService(mock_repo)
    service.check_wave_quota_and_close_if_full = MagicMock(return_value=False)

    payload = {
        "order_id": "tx-1",
        "status": "PAID",
        "payment_method": "qris",
    }
    res = service.process_pakkasir_webhook(payload)

    assert res["success"] is True
    assert tx.status == "success"
    assert applicant.payment_status == "paid"
    assert applicant.status == "document_uploaded_pending"
    mock_repo.update_transaction.assert_called_with(tx)
    mock_repo.update_applicant.assert_called_with(applicant)


def test_late_payment_webhook_on_cancelled_transaction_marked_as_exception():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-2",
        applicant_id="app-2",
        status="cancelled",
        amount=250000,
    )
    applicant = PPDBApplicant(
        id="app-2",
        user_id="user-2",
        wave_id="wave-1",
        status="expired",
        payment_status="failed",
    )
    mock_repo.get_transaction_by_id.return_value = tx
    mock_repo.get_applicant_by_id.return_value = applicant

    service = PaymentService(mock_repo)

    payload = {
        "order_id": "tx-2",
        "status": "PAID",
        "payment_method": "qris",
    }
    res = service.process_pakkasir_webhook(payload)

    assert res["success"] is True
    assert res["status"] == "exception"
    assert tx.status == "exception"
    assert "[PENGECUALIAN ADMIN]" in tx.notes
    # Status pendaftar TIDAK boleh otomatis diluluskan/diubah
    assert applicant.payment_status == "failed"
    assert applicant.status == "expired"
    mock_repo.update_transaction.assert_called_with(tx)
    mock_repo.update_applicant.assert_not_called()


def test_late_payment_webhook_on_expired_applicant_marked_as_exception():
    mock_repo = MagicMock()
    tx = PPDBPaymentTransaction(
        id="tx-3",
        applicant_id="app-3",
        status="pending",
        amount=250000,
    )
    applicant = PPDBApplicant(
        id="app-3",
        user_id="user-3",
        wave_id="wave-1",
        status="expired",
        payment_status="failed",
    )
    mock_repo.get_transaction_by_id.return_value = tx
    mock_repo.get_applicant_by_id.return_value = applicant

    service = PaymentService(mock_repo)

    payload = {
        "order_id": "tx-3",
        "status": "PAID",
        "payment_method": "qris",
    }
    res = service.process_pakkasir_webhook(payload)

    assert res["success"] is True
    assert res["status"] == "exception"
    assert tx.status == "exception"
    assert "[PENGECUALIAN ADMIN]" in tx.notes
    assert applicant.payment_status == "failed"
    assert applicant.status == "expired"
    mock_repo.update_transaction.assert_called_with(tx)
    mock_repo.update_applicant.assert_not_called()
