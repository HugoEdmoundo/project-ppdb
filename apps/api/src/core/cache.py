"""
apps/api/src/core/cache.py

Shared Redis client + helpers untuk:
  - User-session cache  (kurangi N+1 DB query di get_current_user)
  - Rate limiter store  (sliding-window, shared across all worker processes)

Koneksi dibuat sekali (lazy singleton) via get_redis().
Jika Redis tidak tersedia saat startup, aplikasi tetap jalan —
cache/rate-limit fallback ke no-op / in-process fallback.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from redis import Redis  # type: ignore[import-untyped]

from src.core.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None  # type: ignore[type-arg]


def get_redis() -> Redis | None:  # type: ignore[type-arg]
    """Return a Redis client, or None if Redis is unavailable."""
    global _redis
    if _redis is not None:
        return _redis
    try:
        client: Redis = Redis.from_url(  # type: ignore[type-arg]
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=False,
        )
        client.ping()
        _redis = client
        logger.info("Redis connected: %s", settings.redis_url)
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — cache/rate-limit degraded", exc)
        _redis = None
    return _redis


# ── User-session cache ─────────────────────────────────────────────────────────

_SESSION_PREFIX = "usr:"


def cache_user(user_id: str, user: dict[str, Any]) -> None:
    """Simpan dict user ke Redis dengan TTL dari settings.user_cache_ttl."""
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(
            f"{_SESSION_PREFIX}{user_id}",
            settings.user_cache_ttl,
            json.dumps(user, default=str),
        )
    except Exception:
        pass  # cache miss is acceptable


def get_cached_user(user_id: str) -> dict[str, Any] | None:
    """Return cached user dict, or None on cache miss / Redis down."""
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"{_SESSION_PREFIX}{user_id}")
        if raw:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return None


def invalidate_user_cache(user_id: str) -> None:
    """Hapus cache user (panggil setelah update profil / permission)."""
    r = get_redis()
    if r is None:
        return
    try:
        r.delete(f"{_SESSION_PREFIX}{user_id}")
    except Exception:
        pass


# ── Redis sliding-window rate limiter ─────────────────────────────────────────

_RL_PREFIX = "rl:"


def redis_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """
    Sliding-window rate limit via Redis sorted set.

    Returns (allowed: bool, retry_after_seconds: int).
    Falls back to (True, 0) if Redis is unavailable (fail-open).
    """
    r = get_redis()
    if r is None:
        # Redis down → fail-open (jangan block semua user)
        return True, 0

    rkey = f"{_RL_PREFIX}{key}"
    now = time.time()
    window_start = now - window_seconds

    try:
        pipe = r.pipeline()
        # Hapus entries di luar window
        pipe.zremrangebyscore(rkey, "-inf", window_start)
        # Hitung sisa entries dalam window
        pipe.zcard(rkey)
        # Tambah entry baru (score = timestamp)
        pipe.zadd(rkey, {str(now): now})
        # Set TTL agar key dibersihkan otomatis
        pipe.expire(rkey, window_seconds + 1)
        results = pipe.execute()

        count_before_add = int(results[1])
        if count_before_add >= limit:
            # Ambil timestamp entry tertua untuk hitung retry-after
            oldest_entries = r.zrange(rkey, 0, 0, withscores=True)
            if oldest_entries:
                oldest_ts = float(oldest_entries[0][1])
                retry_after = max(1, int(window_seconds - (now - oldest_ts)))
            else:
                retry_after = window_seconds
            # Batalkan penambahan entry yang baru saja kita tambahkan
            r.zrem(rkey, str(now))
            return False, retry_after

        return True, 0
    except Exception as exc:
        logger.warning("Redis rate-limit error (%s) — fail-open", exc)
        return True, 0
