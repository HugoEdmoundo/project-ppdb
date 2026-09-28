"""
apps/api/src/core/rate_limit.py

Redis-backed sliding-window rate limiter.

Menggantikan implementasi in-memory sebelumnya yang tidak aman di multi-worker.
Menggunakan Redis sorted-set agar state dibagi antar semua uvicorn workers.

Fallback: jika Redis tidak tersedia, request di-allow (fail-open) — lebih baik
serve request daripada memblokir semua user saat Redis restart.
"""

from fastapi import HTTPException, Request

from src.core.cache import redis_rate_limit

# Konfigurasi per-endpoint: (limit, window_seconds)
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "login": (10, 60),  # max 10 login attempts/IP/menit
    "register": (5, 60),  # max 5 registrasi/IP/menit
    "register_applicant": (3, 300),  # max 3 pendaftaran/IP/5 menit
    "recover_applicant": (5, 300),  # max 5 recovery/IP/5 menit
    "account_recovery": (5, 300),  # max 5 OTP requests/verifications/IP/5 menit
}


def check_rate_limit(
    request: Request, scope: str, limit: int, window_seconds: int
) -> None:
    """
    Periksa rate limit untuk scope+IP. Raise HTTPException 429 jika terlampaui.
    """
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "unknown"
    )
    key = f"{scope}:{client_ip}"
    allowed, retry_after = redis_rate_limit(key, limit, window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak permintaan. Coba lagi sebentar lagi.",
            headers={"Retry-After": str(retry_after)},
        )


def rate_limit_dependency(scope: str):
    """FastAPI dependency factory menggunakan konfigurasi RATE_LIMITS."""

    def dependency(request: Request) -> None:
        limit, window = RATE_LIMITS.get(scope, (0, 0))
        if limit > 0 and window > 0:
            check_rate_limit(request, scope, limit, window)

    return dependency
