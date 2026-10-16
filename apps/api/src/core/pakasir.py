"""apps/api/src/core/pakasir.py

Pakasir API v2 client + centralized response normalization.

Official v2 documentation reference:
- Create transaction: https://pakasir.com/p/create-transaction
- Transaction status: https://pakasir.com/p/transaction-status
- Webhook: https://pakasir.com/p/webhook
- Cancel transaction: https://pakasir.com/p/cancel-transaction

Catatan bentuk respons (v2): endpoint mengembalikan JSON **datar** (tidak
dibungkus `data`), mis. create-transaction → ``{"txn_id", "order_id",
"qr_string", "expired_at", ...}`` dan transaction-status → ``{"txn_id",
"status", "completed_at", ...}``. Normalizer di bawah menerima bentuk datar
maupun bentuk yang dibungkus ``data`` (kompatibilitas), dan menolak body yang
tidak memuat field wajib agar service tidak menyimpan transaksi yang tidak
bisa direkonsiliasi.

Homogenisasi error:
- ``PakasirError``          → kegagalan pasti (ditolak gateway / kredensial
  belum diatur di production). Aman untuk tidak menyimpan transaksi.
- ``PakasirUncertainError`` → hasil tidak pasti (timeout, 5xx, body rusak).
  Pemanggil harus melakukan rekonsiliasi, bukan menganggap gagal.
"""

from __future__ import annotations

import datetime
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from src.core.config import settings

logger = logging.getLogger("ptdarrahman.pakasir")
WIB = ZoneInfo("Asia/Jakarta")

# ── Canonical status provider ────────────────────────────────────────────────
STATUS_PENDING = "pending"
STATUS_COMPLETED = "completed"
STATUS_CANCELED = "canceled"
STATUS_UNKNOWN = "unknown"

_SUCCESS_STATUSES = {"completed", "paid", "success", "settlement", "lunas"}
_PENDING_STATUSES = {"pending", "unpaid", "waiting", "menunggu", "processing"}
_CANCELED_STATUSES = {
    "canceled",
    "cancelled",
    "failed",
    "expired",
    "gagal",
    "batal",
    "denied",
}

_MAX_LOGGED_BODY = 500


class PakasirError(Exception):
    """Kegagalan pasti dari gateway (permintaan ditolak / salah konfigurasi)."""

    def __init__(self, message: str, status_code: int = 502, details: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class PakasirUncertainError(PakasirError):
    """Hasil gateway tidak dapat dipastikan → wajib rekonsiliasi.

    Dipakai untuk timeout jaringan, respons 5xx, atau body yang tidak lengkap.
    Semantik penting: transaksi bisa saja sudah dibuat di sisi provider, jadi
    pemanggil TIDAK boleh menandainya gagal/expired tanpa verifikasi.
    """


# ── Dataclasses hasil normalisasi ───────────────────────────────────────────


@dataclass(frozen=True)
class CreateTransactionResult:
    txn_id: str
    order_id: str | None
    amount: int | None
    fee: int | None
    total_payment: int | None
    payment_method: str | None
    qr_string: str | None
    payment_link: str | None
    va_number: str | None
    expired_at: str | None
    is_sandbox: bool
    raw: dict[str, Any] = field(repr=False)


@dataclass(frozen=True)
class TransactionStatusResult:
    txn_id: str | None
    order_id: str | None
    amount: int | None
    status: str  # canonical: pending | completed | canceled | unknown
    provider_status: str  # nilai mentah dari provider (lowercase)
    completed_at: str | None
    is_sandbox: bool
    raw: dict[str, Any] = field(repr=False)


@dataclass(frozen=True)
class CancelTransactionResult:
    confirmed: bool
    message: str | None
    raw: dict[str, Any] = field(repr=False)


# ── Helpers normalisasi ─────────────────────────────────────────────────────


def _redact(text: str) -> str:
    """Buang kredensial dari teks yang akan di-log/di-request-detail."""
    for secret in (settings.pakasir_api_key, settings.pakasir_webhook_secret):
        if secret:
            text = text.replace(secret, "***")
    return text


def _safe_body(resp: httpx.Response | None) -> str:
    if resp is None:
        return ""
    try:
        text = resp.text or ""
    except Exception:  # pragma: no cover - defensive
        return ""
    return _redact(text)[:_MAX_LOGGED_BODY]


def _safe_dump(value: Any) -> str:
    try:
        import json

        return _redact(json.dumps(value, default=str))[:_MAX_LOGGED_BODY]
    except Exception:  # pragma: no cover - defensive
        return _redact(str(value))[:_MAX_LOGGED_BODY]


def _as_dict(value: Any) -> dict[str, Any] | None:
    return value if isinstance(value, dict) else None


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_int(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _unwrap_response(raw: Any) -> dict[str, Any]:
    """Terima format datar (v2) maupun yang dibungkus ``data`` (legacy/mock)."""
    data = _as_dict(raw)
    if data is None:
        raise PakasirUncertainError(
            "Respons gateway bukan objek JSON yang valid",
            details=_safe_dump(raw),
        )
    nested = data.get("data")
    if isinstance(nested, dict):
        return nested
    return data


def _raise_on_body_error(raw: Any) -> None:
    """Deteksi error yang dikirim dengan HTTP 2xx (jarang, tapi eksplisit)."""
    data = _as_dict(raw) or {}
    err = data.get("error")
    status = str(data.get("status") or "").strip().lower()
    if err or status in {"error", "fail"}:
        message = (
            err
            if isinstance(err, str)
            else (data.get("message") or "Gateway menolak permintaan")
        )
        raise PakasirError(str(message), status_code=502, details=_safe_dump(raw))


def canonical_status(raw: Any) -> str:
    """Petakan status mentah provider ke himpunan kanonik."""
    value = str(raw or "").strip().lower()
    if value in _SUCCESS_STATUSES:
        return STATUS_COMPLETED
    if value in _CANCELED_STATUSES:
        return STATUS_CANCELED
    if value in _PENDING_STATUSES:
        return STATUS_PENDING
    return STATUS_UNKNOWN


def normalize_create_response(raw: Any) -> CreateTransactionResult:
    """Normalisasi respons create-transaction; wajib memuat ``txn_id``."""
    _raise_on_body_error(raw)
    data = _unwrap_response(raw)
    txn_id = _as_str(data.get("txn_id"))
    if not txn_id:
        raise PakasirUncertainError(
            "Respons create-transaction tidak memuat txn_id",
            details=_safe_dump(raw),
        )
    return CreateTransactionResult(
        txn_id=txn_id,
        order_id=_as_str(data.get("order_id")),
        amount=_as_int(data.get("amount")),
        fee=_as_int(data.get("fee")),
        total_payment=_as_int(data.get("total_payment")),
        payment_method=_as_str(data.get("payment_method")),
        qr_string=_as_str(data.get("qr_string") or data.get("payment_number")),
        payment_link=_as_str(data.get("payment_link")),
        va_number=_as_str(data.get("va_number")),
        expired_at=_as_str(data.get("expired_at")),
        is_sandbox=bool(data.get("is_sandbox", False)),
        raw=data,
    )


def normalize_status_response(raw: Any) -> TransactionStatusResult:
    """Normalisasi respons transaction-status; wajib memuat ``status``."""
    data = _unwrap_response(raw)
    provider_status = _as_str(data.get("status"))
    if not provider_status:
        raise PakasirUncertainError(
            "Respons status transaksi tidak memuat field status",
            details=_safe_dump(raw),
        )
    return TransactionStatusResult(
        txn_id=_as_str(data.get("txn_id")),
        order_id=_as_str(data.get("order_id")),
        amount=_as_int(data.get("amount")),
        status=canonical_status(provider_status),
        provider_status=provider_status.lower(),
        completed_at=_as_str(data.get("completed_at")),
        is_sandbox=bool(data.get("is_sandbox", False)),
        raw=data,
    )


def normalize_cancel_response(raw: Any) -> CancelTransactionResult:
    """Normalisasi respons cancel-transaction.

    Dokumentasi v2 hanya mengembalikan ``{"message": "Berhasil batalkan
    transaksi"}``. Kehadiran pesan dianggap bukti pembatalan; body kosong/rusak
    ditandai ``confirmed=False`` agar pemanggil melakukan sinkronisasi status.
    """
    data = _as_dict(raw)
    if data is None:
        raise PakasirUncertainError(
            "Respons pembatalan gateway tidak valid",
            details=_safe_dump(raw),
        )
    nested = data.get("data")
    inner: dict[str, Any] = nested if isinstance(nested, dict) else data
    message = _as_str(inner.get("message") or data.get("message"))
    return CancelTransactionResult(
        confirmed=bool(message),
        message=message,
        raw=inner,
    )


def _sandbox_create_result(
    order_id: str, amount: int, method: str, slug: str
) -> CreateTransactionResult:
    """QRIS palsu untuk dev/test ketika API key belum diatur (NON-production)."""
    now = datetime.datetime.now(datetime.UTC)
    expired_at = now + datetime.timedelta(minutes=15)
    qr_raw = (
        "00020101021226610016ID.CO.QRIS.WWW01189360091800216005230208216005"
        "230303UME"
        f"52047929530336054{amount:010d}.005802ID5916PPDB "
        f"PTDARRAHMAN6006BEKASI610517510"
        f"62250121{order_id[:20]}6304"
    )
    crc = hashlib.md5(order_id.encode()).hexdigest()[:4].upper()
    data: dict[str, Any] = {
        "txn_id": f"txn_{order_id[:16]}",
        "project": slug,
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
    return normalize_create_response(data)


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

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.slug)

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        return headers

    def _guard_unconfigured(self, action: str) -> None:
        """Production tidak boleh diam-diam memakai mode sandbox."""
        if self.api_key:
            return
        if settings.is_production:
            raise PakasirError(
                f"PAKASIR_API_KEY belum dikonfigurasi — {action} ditolak "
                "di mode production.",
                status_code=503,
            )
        logger.warning(
            "PAKASIR_API_KEY tidak diset — %s memakai mode sandbox "
            "(hanya untuk non-production).",
            action,
        )

    def create_transaction(
        self,
        order_id: str,
        amount: int,
        method: str = "qris",
    ) -> CreateTransactionResult:
        """POST /api/v2/create-transaction/{slug}/{order_id} (find-or-create)."""
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")

        if not self.api_key:
            self._guard_unconfigured("create-transaction")
            return _sandbox_create_result(order_id, amount, method, self.slug)

        url = f"{self.base_url}/api/v2/create-transaction/{self.slug}/{order_id}"
        payload = {"method": method, "amount": int(amount)}

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=self._headers(), json=payload)
        except httpx.RequestError as exc:
            logger.error("Pakasir create_transaction network error: %s", exc)
            raise PakasirUncertainError(
                f"Koneksi ke gateway pembayaran gagal: {exc}"
            ) from exc

        if resp.status_code >= 500:
            logger.error(
                "Pakasir create_transaction server error: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirUncertainError(
                f"Gateway pembayaran mengalami gangguan ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )
        if resp.status_code >= 400:
            logger.error(
                "Pakasir create_transaction rejected: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirError(
                f"Gateway menolak pembuatan transaksi ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )

        try:
            body = resp.json()
        except ValueError as exc:
            raise PakasirUncertainError(
                "Respons create-transaction gateway bukan JSON yang valid",
                details=_safe_body(resp),
            ) from exc
        return normalize_create_response(body)

    def get_transaction_status(self, txn_id: str) -> TransactionStatusResult:
        """GET /api/v2/transaction-status/{slug}/{txn_id}."""
        if not self.api_key:
            self._guard_unconfigured("transaction-status")
            return normalize_status_response(
                {
                    "txn_id": txn_id,
                    "order_id": None,
                    "amount": None,
                    "is_sandbox": True,
                    "status": "pending",
                    "completed_at": None,
                }
            )

        url = f"{self.base_url}/api/v2/transaction-status/{self.slug}/{txn_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=self._headers())
        except httpx.RequestError as exc:
            logger.error("Pakasir get_transaction_status network error: %s", exc)
            raise PakasirUncertainError(
                f"Koneksi ke gateway pembayaran gagal: {exc}"
            ) from exc

        if resp.status_code >= 500:
            logger.error(
                "Pakasir get_transaction_status server error: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirUncertainError(
                f"Gateway pembayaran mengalami gangguan ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )
        if resp.status_code >= 400:
            logger.error(
                "Pakasir get_transaction_status rejected: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirError(
                f"Gateway menolak permintaan status ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )

        try:
            body = resp.json()
        except ValueError as exc:
            raise PakasirUncertainError(
                "Respons status gateway bukan JSON yang valid",
                details=_safe_body(resp),
            ) from exc
        return normalize_status_response(body)

    def cancel_transaction(self, txn_id: str) -> CancelTransactionResult:
        """POST /api/v2/cancel-transaction/{slug}/{txn_id}."""
        if not self.api_key:
            self._guard_unconfigured("cancel-transaction")
            return normalize_cancel_response(
                {"message": "Berhasil batalkan transaksi (sandbox mode)"}
            )

        url = f"{self.base_url}/api/v2/cancel-transaction/{self.slug}/{txn_id}"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=self._headers())
        except httpx.RequestError as exc:
            logger.error("Pakasir cancel_transaction network error: %s", exc)
            raise PakasirUncertainError(
                f"Koneksi ke gateway pembayaran gagal: {exc}"
            ) from exc

        if resp.status_code >= 500:
            logger.error(
                "Pakasir cancel_transaction server error: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirUncertainError(
                f"Gateway pembayaran mengalami gangguan ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )
        if resp.status_code >= 400:
            logger.error(
                "Pakasir cancel_transaction rejected: %s - %s",
                resp.status_code,
                _safe_body(resp),
            )
            raise PakasirError(
                f"Gateway menolak pembatalan transaksi ({resp.status_code})",
                status_code=resp.status_code,
                details=_safe_body(resp),
            )

        try:
            body = resp.json()
        except ValueError as exc:
            raise PakasirUncertainError(
                "Respons pembatalan gateway bukan JSON yang valid",
                details=_safe_body(resp),
            ) from exc
        return normalize_cancel_response(body)


_default_client: PakasirClient | None = None


def get_pakasir_client() -> PakasirClient:
    global _default_client
    if _default_client is None:
        _default_client = PakasirClient()
    return _default_client


def reset_pakasir_client() -> None:
    """Uji/ops: paksa klien berikutnya membaca ulang settings terbaru."""
    global _default_client
    _default_client = None
