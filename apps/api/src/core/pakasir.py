"""apps/api/src/core/pakasir.py

Pakasir API v2 Client implementation.
Official v2 documentation reference:
- Create transaction: https://pakasir.com/p/create-transaction
- Transaction status: https://pakasir.com/p/transaction-status
- Webhook: https://pakasir.com/p/webhook
- Cancel transaction: https://pakasir.com/p/cancel-transaction
"""

from __future__ import annotations

import datetime
import hashlib
import logging
from typing import Any, cast
from zoneinfo import ZoneInfo

import httpx

from src.core.config import settings

logger = logging.getLogger("ptdarrahman.pakasir")
WIB = ZoneInfo("Asia/Jakarta")


class PakasirError(Exception):
    def __init__(self, message: str, status_code: int = 502, details: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class PakasirClient:
    def __init__(
        self,
        base_url: str | None = None,
        slug: str | None = None,
        api_key: str | None = None,
    ):
        self.base_url = (
            base_url or settings.pakasir_base_url or "https://app.pakasir.com"
        ).rstrip("/")
        self.slug = slug or settings.pakasir_slug or "arrahman"
        self.api_key = api_key or settings.pakasir_api_key

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        return headers

    def create_transaction(
        self,
        order_id: str,
        amount: int,
        method: str = "qris",
    ) -> dict[str, Any]:
        """Create transaction via POST /api/v2/create-transaction/{slug}/{order_id}"""
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")

        # Fallback for unit testing/mock when API key is not configured
        if not self.api_key:
            logger.warning(
                "PAKASIR_API_KEY is not configured. "
                "Generating sandbox mock transaction."
            )
            now = datetime.datetime.now(datetime.UTC)
            expired_at = now + datetime.timedelta(minutes=15)
            # Standard QRIS payload format for test/local
            qr_raw = (
                f"00020101021226610016ID.CO.QRIS.WWW01189360091800216005230208216005230303UME"
                f"52047929530336054{amount:010d}.005802ID5918PPDB "
                f"AR-RAHMAN6005BOGOR610516110"
                f"62250121{order_id[:20]}6304"
            )
            crc = hashlib.md5(order_id.encode()).hexdigest()[:4].upper()
            return {
                "txn_id": f"txn_{order_id[:16]}",
                "project": self.slug,
                "order_id": order_id,
                "amount": amount,
                "fee": 0,
                "total_payment": amount,
                "payment_method": method,
                "qr_string": f"{qr_raw}{crc}",
                "va_number": "",
                "expired_at": expired_at.isoformat(),
                "is_sandbox": True,
            }

        url = f"{self.base_url}/api/v2/create-transaction/{self.slug}/{order_id}"
        payload = {
            "method": method,
            "amount": int(amount),
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=self._headers(), json=payload)
                if resp.status_code >= 400:
                    logger.error(
                        "Pakasir create_transaction failed: %s - %s",
                        resp.status_code,
                        resp.text,
                    )
                    raise PakasirError(
                        f"Gagal membuat transaksi di Pakasir ({resp.status_code})",
                        status_code=resp.status_code,
                        details=resp.text,
                    )
                return cast(dict[str, Any], resp.json())
        except httpx.RequestError as exc:
            logger.error("Pakasir network error during create_transaction: %s", exc)
            raise PakasirError(f"Koneksi ke gateway pembayaran gagal: {exc}") from exc

    def get_transaction_status(self, txn_id: str) -> dict[str, Any]:
        """Fetch transaction status.

        GET /api/v2/transaction-status/{slug}/{txn_id}
        """
        if not self.api_key:
            # Fallback for offline/test environments
            return {
                "txn_id": txn_id,
                "order_id": "",
                "amount": 0,
                "is_sandbox": True,
                "status": "pending",
                "completed_at": None,
            }

        url = f"{self.base_url}/api/v2/transaction-status/{self.slug}/{txn_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=self._headers())
                if resp.status_code >= 400:
                    logger.error(
                        "Pakasir get_transaction_status failed: %s - %s",
                        resp.status_code,
                        resp.text,
                    )
                    raise PakasirError(
                        "Gagal mengambil status transaksi di Pakasir "
                        f"({resp.status_code})",
                        status_code=resp.status_code,
                        details=resp.text,
                    )
                return cast(dict[str, Any], resp.json())
        except httpx.RequestError as exc:
            logger.error("Pakasir network error during get_transaction_status: %s", exc)
            raise PakasirError(f"Koneksi ke gateway pembayaran gagal: {exc}") from exc

    def cancel_transaction(self, txn_id: str) -> dict[str, Any]:
        """Cancel transaction via POST /api/v2/cancel-transaction/{slug}/{txn_id}"""
        if not self.api_key:
            return {"message": "Berhasil batalkan transaksi (sandbox mode)"}

        url = f"{self.base_url}/api/v2/cancel-transaction/{self.slug}/{txn_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=self._headers())
                if resp.status_code >= 400:
                    logger.error(
                        "Pakasir cancel_transaction failed: %s - %s",
                        resp.status_code,
                        resp.text,
                    )
                    raise PakasirError(
                        f"Gagal membatalkan transaksi di Pakasir ({resp.status_code})",
                        status_code=resp.status_code,
                        details=resp.text,
                    )
                return cast(dict[str, Any], resp.json())
        except httpx.RequestError as exc:
            logger.error("Pakasir network error during cancel_transaction: %s", exc)
            raise PakasirError(f"Koneksi ke gateway pembayaran gagal: {exc}") from exc


_default_client: PakasirClient | None = None


def get_pakasir_client() -> PakasirClient:
    global _default_client
    if _default_client is None:
        _default_client = PakasirClient()
    return _default_client
