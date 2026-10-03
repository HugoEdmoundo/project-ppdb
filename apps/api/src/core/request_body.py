"""
src/core/request_body.py

Pembacaan body request yang toleran terhadap Content-Type salah.

FastAPI hanya mem-parse body sebagai JSON bila `Content-Type` berawalan
`application/json`. `fetch()` di browser otomatis men-set `text/plain` bila
body berupa string tanpa header eksplisit — body lalu dianggap byte mentah dan
Pydantic menolak dengan 422. Untuk endpoint yang tidak boleh gagal (logout),
body dibaca manual: JSON valid dipakai, sisanya diabaikan.
"""

import json
import logging
from typing import Any

from fastapi import Request

logger = logging.getLogger("ptdarrahman.request_body")


async def read_json_object(request: Request) -> dict[str, Any]:
    """Return body sebagai dict, atau dict kosong bila bukan JSON yang valid."""
    try:
        raw = (await request.body()).strip()
    except Exception:  # pragma: no cover - body sudah terkonsumsi / stream error
        return {}
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        logger.debug("Ignoring non-JSON request body for %s", request.url.path)
        return {}
    return data if isinstance(data, dict) else {}


async def read_refresh_token(request: Request) -> str | None:
    """Ambil `refresh_token` dari body tanpa mensyaratkan Content-Type JSON."""
    value = (await read_json_object(request)).get("refresh_token")
    return value if isinstance(value, str) and value else None
