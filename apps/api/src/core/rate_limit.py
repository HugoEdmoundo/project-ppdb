"""In-memory sliding-window rate limiter untuk endpoint publik.

Melindungi endpoint publik (login, register) dari brute-force/spam tanpa
menambah dependensi eksternal dan tanpa bergantung pada tabel DB.

Catatan: in-memory bersifat per-proses. Cocok untuk deploy single-instance
(API monolitik ini). Untuk multi-instance gunakan store bersama (Redis).
"""

import threading
import time

from fastapi import HTTPException, Request

# Konfigurasi per-endpoint: (limit, window_seconds)
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "login": (10, 60),  # max 10 login attempts per IP per menit
    "register": (5, 60),  # max 5 registrasi per IP per menit
    "register_applicant": (3, 300),  # max 3 pendaftaran per IP per 5 menit
}

# {key: [timestamps]} — sliding window log.
_buckets: dict[str, list[float]] = {}
_lock = threading.Lock()

# Batas atas baris yang disimpan per key untuk cegah pertumbuhan tak terkendali.
_MAX_ENTRIES = 1000


def _now() -> float:
    return time.monotonic()


def check_rate_limit(
    request: Request, scope: str, limit: int, window_seconds: int
) -> None:
    """Periksa dan catat hit rate limit untuk scope+IP.

    Raise HTTPException(429) jika melebihi limit dalam window.
    """
    client_ip = request.client.host if request.client else "unknown"
    key = f"{scope}:{client_ip}"
    now = _now()
    window_start = now - window_seconds

    with _lock:
        bucket = _buckets.setdefault(key, [])
        # Buang entry lama.
        if bucket and bucket[0] < window_start:
            bucket[:] = [t for t in bucket if t >= window_start]
        # Batasi ukuran bucket.
        if len(bucket) >= _MAX_ENTRIES:
            bucket = bucket[-_MAX_ENTRIES:]
            _buckets[key] = bucket

        if len(bucket) >= limit:
            oldest = bucket[0]
            retry_after = max(1, int(window_seconds - (now - oldest)))
            raise HTTPException(
                status_code=429,
                detail="Terlalu banyak permintaan. Coba lagi sebentar lagi.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)

    # Pangkas key yang sudah tidak aktif untuk cegah kebocoran memori.
    if len(_buckets) > 10000:
        with _lock:
            for k in list(_buckets.keys()):
                if _buckets[k] and _now() - _buckets[k][-1] > 3600:
                    del _buckets[k]


def rate_limit_dependency(scope: str):
    """Factory dependency FastAPI yang menggunakan konfigurasi RATE_LIMITS."""

    def dependency(request: Request) -> None:
        limit, window = RATE_LIMITS.get(scope, (0, 0))
        if limit > 0 and window > 0:
            check_rate_limit(request, scope, limit, window)

    return dependency
