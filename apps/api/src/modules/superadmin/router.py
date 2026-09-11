from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from src.core.database import WIB, execute_raw, search_paginated
from src.core.dependencies import require_superadmin

router = APIRouter()


def _build_registration_trend(days: int = 30) -> list[dict[str, Any]]:
    """Aggregate real registrations per day for the last ``days`` days.

    Cross-DB aware: fetches only the ``created_at`` column rows newer than the
    cutoff and buckets them in Python instead of relying on DB-specific date
    functions (works on both MySQL and SQLite).
    """
    start = datetime.now(WIB) - timedelta(days=days - 1)
    rows = execute_raw(
        "SELECT `created_at` FROM `ppdb_applicants` "
        "WHERE `created_at` >= :start",
        {"start": start.strftime("%Y-%m-%d")},
    )

    counts: dict[str, int] = {}
    for row in rows:
        key = str(row["created_at"])[:10]
        counts[key] = counts.get(key, 0) + 1

    trend: list[dict[str, Any]] = []
    for i in range(days):
        day = start.date() + timedelta(days=i)
        key = day.strftime("%Y-%m-%d")
        trend.append({"date": day.strftime("%d %b"), "users": counts.get(key, 0)})
    return trend


@router.get("/dashboard")
async def get_dashboard(user: dict[str, Any] = Depends(require_superadmin)):
    total_users_res = search_paginated("users", per_page=1)
    total_users = total_users_res.get("total", 0)

    total_roles_res = search_paginated("roles", per_page=1)
    total_roles = total_roles_res.get("total", 0)

    total_applicants_res = search_paginated("ppdb_applicants", per_page=1)
    total_applicants = total_applicants_res.get("total", 0)

    # Get recent Audit Logs (max 5)
    recent_logs_res = search_paginated("audit_log", per_page=5, order="created_at.desc")
    recent_logs = recent_logs_res.get("data", [])

    return {
        "stats": {
            "total_users": total_users,
            "total_roles": total_roles,
            "total_applicants": total_applicants,
        },
        "recent_logs": recent_logs,
        "trend": _build_registration_trend(),
    }