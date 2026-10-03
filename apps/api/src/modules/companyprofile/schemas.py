"""Column whitelists and payload validation for the companyprofile CMS entities.

The generic entity CRUD endpoints accept arbitrary JSON. This module constrains
the accepted keys, types, lengths and required fields per entity so that bad
input never reaches the SQL layer -- which would otherwise surface as an opaque
HTTP 500 from the error middleware instead of a clean 4xx the admin UI can show.

Three layers of validation, cheapest first:

1. **Whitelist** -- unknown keys are rejected outright (not silently dropped,
   not forwarded to SQL).
2. **Required fields** -- enforced on create only. A partial update must never
   fail just because a NOT NULL column is absent from the body.
3. **Type / length / format** -- ints are coerced, bounded strings are measured
   against the real column width, news dates and slugs are normalized.
"""

from __future__ import annotations

import re
from datetime import date as date_type
from typing import Any

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

# Columns that must be present (and non-empty) when creating a row. Mirrors the
# `nullable=False` declarations in `src/models/content.py`. Checked on create
# only -- see the module docstring.
REQUIRED_FIELDS: dict[str, set[str]] = {
    "news": {"slug", "category"},
    "programs": {"slug"},
    "facilities": {"category"},
    "staff": {"role"},
    "achievements": {"year"},
    "gallery": {"category"},
    "social-links": {"label", "href", "path"},
    "testimonials": {"name", "child"},
}

# Simple per-column type coercion for columns that map to typed DB columns.
INT_COLUMNS: dict[str, set[str]] = {
    "achievements": {"year"},
    "testimonials": {"order"},
}

# Real column widths from `src/models/content.py`. Oversized input is a client
# bug, and MySQL would either truncate silently or raise a 1406 error; catching
# it here gives the admin an actual message.
MAX_LENGTHS: dict[str, int] = {
    "slug": 255,
    "image": 255,
    "icon": 255,
    "category": 100,
    "date": 50,
    "label": 255,
    "href": 255,
    "name": 255,
    "child": 255,
    "role": 100,
}

# Unbounded Text columns. A generous cap still stops a runaway payload (an
# accidental multi-megabyte string pasted into the article body) from reaching
# the database.
TEXT_LIMIT = 500_000

# Entities whose `slug` participates in the public URL and is therefore
# normalized and checked for uniqueness.
SLUG_ENTITIES: frozenset[str] = frozenset({"news", "programs"})

# Column defaults for create. `testimonials.order` is `nullable=False,
# default=0` in the model, but that default lives in SQLAlchemy's Python-side
# insert path -- and the generic CRUD router writes with a raw INSERT, so the
# database never sees it. Without this a create that omits `order` would fail
# on the NOT NULL constraint. Keyed by column; applied per entity.
COLUMN_DEFAULTS: dict[str, dict[str, Any]] = {
    "testimonials": {"order": 0},
}

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SLUG_ALLOWED_RE = re.compile(r"[^a-z0-9]+")


def _to_int(value: Any, field: str) -> int:
    if isinstance(value, bool):
        raise ValueError(f"Field '{field}' must be an integer")
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Field '{field}' must be an integer") from exc


def normalize_slug(value: Any) -> str:
    """Normalize arbitrary text into a URL-safe slug.

    Lowercase, non-alphanumerics collapsed to single dashes, trimmed. Empty or
    fully-punctuation input is an error rather than an empty string, because an
    empty slug would produce a broken public URL (``/news/``).
    """
    if value is None:
        raise ValueError("Field 'slug' is required")
    text = str(value).strip().lower()
    text = _SLUG_ALLOWED_RE.sub("-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    if not text:
        raise ValueError(
            "Field 'slug' must contain at least one letter or number "
            "after normalization"
        )
    return text


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


def _check_length(field: str, value: Any) -> None:
    if not isinstance(value, str):
        return
    limit = MAX_LENGTHS.get(field, TEXT_LIMIT)
    if len(value) > limit:
        if field in MAX_LENGTHS:
            raise ValueError(
                f"Field '{field}' exceeds the maximum length of {limit} characters"
            )
        raise ValueError(f"Field '{field}' is too large (max {limit} characters)")


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def sanitize_entity_payload(
    entity: str, body: dict[str, Any], *, partial: bool = False
) -> dict[str, Any]:
    """Filter and validate `body` down to the writable columns of `entity`.

    `partial=True` relaxes the required-field check, for PATCH-style updates
    where the body legitimately carries only the fields the admin changed.

    Raises ValueError with a helpful message on unknown/invalid fields; callers
    translate that into an HTTP 422.
    """
    allowed = ENTITY_COLUMNS.get(entity)
    if allowed is None:
        raise ValueError(f"Unknown entity: {entity}")

    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object")

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
        elif key == "slug" and entity in SLUG_ENTITIES:
            slug = normalize_slug(value)
            _check_length(key, slug)
            sanitized[key] = slug
        elif entity == "news" and key == "date":
            sanitized[key] = _normalize_news_date(value)
        else:
            _check_length(key, value)
            sanitized[key] = value

    if not partial:
        for key, value in COLUMN_DEFAULTS.get(entity, {}).items():
            sanitized.setdefault(key, value)

        missing = sorted(
            f for f in REQUIRED_FIELDS.get(entity, set()) if _is_blank(sanitized.get(f))
        )
        if missing:
            raise ValueError(
                f"Missing required field(s) for '{entity}': {', '.join(missing)}"
            )
        if not sanitized:
            raise ValueError(f"No writable fields supplied for '{entity}'")

    return sanitized
