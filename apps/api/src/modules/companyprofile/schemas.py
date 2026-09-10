"""Column whitelists and payload sanitization for the companyprofile CMS entities.

The generic entity CRUD endpoints accept arbitrary JSON. This module constrains
the accepted keys and basic types per entity so that unknown/typed columns never
reach the SQL layer (which would otherwise raise a 500 instead of a clean 400).
"""

from __future__ import annotations

import re
from datetime import date as date_type
from typing import Any

# Columns each entity is allowed to write. Keys present in the request body that
# are not listed here are rejected (400), not silently dropped or forwarded to SQL.
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# Columns each entity is allowed to write. Keys present in the request body that
# are not listed here are rejected (400), not silently dropped or forwarded to SQL.
ENTITY_COLUMNS: dict[str, set[str]] = {
    "news": {"slug", "category", "date", "image", "gallery", "content"},
    "programs": {"slug", "icon", "image", "content"},
    "facilities": {"category", "image", "content"},
    "staff": {"role", "image", "content"},
    "achievements": {"year", "image", "content"},
    "gallery": {"category", "image", "content"},
    "social-links": {"label", "href", "path"},
    "testimonials": {"name", "child", "image", "order", "content"},
}

# Simple per-column type coercion for columns that map to typed DB columns.
INT_COLUMNS: dict[str, set[str]] = {
    "achievements": {"year"},
    "testimonials": {"order"},
}


def _to_int(value: Any, field: str) -> int:
    if isinstance(value, bool):
        raise ValueError(f"Field '{field}' must be an integer")
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Field '{field}' must be an integer") from exc


def _normalize_news_date(value: Any) -> str:
    """Normalize the news `date` to an ISO `YYYY-MM-DD` string."""
    if value is None:
        return ""
    if isinstance(value, date_type):
        return value.isoformat()
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return ""
        if _DATE_RE.match(text):
            return text
        # Support a YYYY-MM-DD prefix from full datetimes.
        candidate = text[:10]
        if _DATE_RE.match(candidate):
            return candidate
        raise ValueError("Field 'date' must use YYYY-MM-DD format")
    raise ValueError("Field 'date' must use YYYY-MM-DD format")


def sanitize_entity_payload(entity: str, body: dict[str, Any]) -> dict[str, Any]:
    """Filter `body` down to the writable columns of `entity`.

    Raises ValueError with a helpful message on unknown/invalid fields.
    """
    allowed = ENTITY_COLUMNS.get(entity)
    if allowed is None:
        raise ValueError(f"Unknown entity: {entity}")

    int_fields = INT_COLUMNS.get(entity, set())
    sanitized: dict[str, Any] = {}
    unknown = [k for k in body if k not in allowed]
    if unknown:
        raise ValueError(f"Unknown fields for '{entity}': {', '.join(sorted(unknown))}")

    for key in allowed:
        if key not in body:
            continue
        value = body[key]
        if key in int_fields:
            sanitized[key] = _to_int(value, key)
        elif entity == "news" and key == "date":
            sanitized[key] = _normalize_news_date(value)
        else:
            sanitized[key] = value
    return sanitized
