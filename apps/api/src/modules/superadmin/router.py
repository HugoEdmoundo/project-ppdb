import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query

from src.core.database import WIB, execute_raw, search_paginated
from src.core.dependencies import require_superadmin

router = APIRouter()


def _count_where(
    table: str, condition: str, params: dict[str, Any] | None = None
) -> int:
    rows = execute_raw(
        f"SELECT COUNT(*) AS `n` FROM `{table}` WHERE {condition}", params
    ) or [{"n": 0}]
    return int(rows[0]["n"])


def _group_counts(
    table: str,
    column: str,
    condition: str = "",
    params: dict[str, Any] | None = None,
) -> dict[str, int]:
    """Distribusi nilai sebuah kolom string (cross-DB: MySQL + SQLite)."""
    where = f" WHERE {condition}" if condition else ""
    rows = (
        execute_raw(
            f"SELECT `{column}` AS `k`, COUNT(*) AS `n` FROM `{table}`{where} "
            f"GROUP BY `{column}`",
            params,
        )
        or []
    )
    return {str(r["k"]): int(r["n"]) for r in rows}


def _get_active_wave() -> tuple[str | None, dict[str, Any] | None]:
    """Resolve satu gelombang aktif (system-wide) + jumlah pendaftarnya."""
    rows = (
        execute_raw(
            "SELECT `id`, `name`, `quota`, `status` FROM `ppdb_waves` "
            "WHERE `status` = 'active' LIMIT 1"
        )
        or []
    )
    if not rows:
        return None, None
    w = rows[0]
    filled = _count_where("ppdb_applicants", "`wave_id` = :wid", {"wid": w["id"]})
    return str(w["id"]), {
        "id": str(w["id"]),
        "name": w["name"],
        "quota": int(w["quota"] or 0),
        "filled": filled,
    }


def _build_trend_with_delta(
    days: int = 30, wave_id: str | None = None
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Registrasi pendaftar per hari untuk ``days`` terakhir + delta jumlah
    registrasi dibandingkan ``days`` hari sebelumnya.

    Bisa dibatasi ke satu gelombang (``wave_id``). Cross-DB aware: hanya
    SELECT kolom ``created_at`` lalu di-bucket di Python supaya bekerja di
    MySQL dan SQLite tanpa fungsi tanggal spesifik DB.
    """
    start = datetime.now(WIB) - timedelta(days=(2 * days) - 1)
    wave_clause = " AND `wave_id` = :wave_id" if wave_id else ""
    params: dict[str, Any] = {"start": start.strftime("%Y-%m-%d")}
    if wave_id:
        params["wave_id"] = wave_id
    rows = execute_raw(
        "SELECT `created_at` FROM `ppdb_applicants` "
        "WHERE `created_at` >= :start" + wave_clause,
        params,
    )

    counts: dict[str, int] = {}
    for row in rows or []:
        key = str(row["created_at"])[:10]
        counts[key] = counts.get(key, 0) + 1

    dates = [start.date() + timedelta(days=i) for i in range(2 * days)]
    recent = sum(counts.get(d.strftime("%Y-%m-%d"), 0) for d in dates[days:])
    previous = sum(counts.get(d.strftime("%Y-%m-%d"), 0) for d in dates[:days])

    delta: dict[str, Any] = {"current": recent, "previous": previous, "pct": None}
    if previous > 0:
        delta["pct"] = round(((recent - previous) / previous) * 100)

    trend = [
        {"date": d.strftime("%d %b"), "users": counts.get(d.strftime("%Y-%m-%d"), 0)}
        for d in dates[days:]
    ]
    return trend, delta


def _parse_changes(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return None
    return value


@router.get("/dashboard")
async def get_dashboard(user: dict[str, Any] = Depends(require_superadmin)):
    total_users_res = search_paginated("users", per_page=1)
    total_users = total_users_res.get("total", 0)

    total_roles_res = search_paginated("roles", per_page=1)
    total_roles = total_roles_res.get("total", 0)

    # Semua metrik PPDB di-scope ke gelombang yang sedang aktif saja.
    wave_id, active_wave = _get_active_wave()

    if wave_id:
        total_applicants = _count_where(
            "ppdb_applicants", "`wave_id` = :wid", {"wid": wave_id}
        )
        applicants_by_payment = _group_counts(
            "ppdb_applicants",
            "payment_status",
            "`wave_id` = :wid",
            {"wid": wave_id},
        )
        trend, delta = _build_trend_with_delta(wave_id=wave_id)
    else:
        total_applicants = 0
        applicants_by_payment = {}
        trend = []
        delta = {"current": 0, "previous": 0, "pct": None}

    month_start = (datetime.now(WIB) - timedelta(days=29)).strftime("%Y-%m-%d")

    stats = {
        "total_users": total_users,
        "total_roles": total_roles,
        "total_applicants": total_applicants,
        "users_by_type": _group_counts("users", "user_type"),
        "users_active": _count_where("users", "`is_active` = 1"),
        "users_inactive": _count_where("users", "`is_active` = 0"),
        "users_new_30d": _count_where(
            "users", "`created_at` >= :start", {"start": month_start}
        ),
        "system_roles": _count_where("roles", "`is_system` = 1"),
        "custom_roles": _count_where("roles", "`is_system` = 0"),
        "applicants_by_payment": applicants_by_payment,
        "applicants_new_30d": delta["current"],
    }

    notif_rows = (
        execute_raw("SELECT `status`, `created_at` FROM `notification_logs`") or []
    )
    today = datetime.now(WIB).strftime("%Y-%m-%d")
    notifications = {
        "sent": sum(1 for r in notif_rows if r["status"] == "sent"),
        "failed": sum(1 for r in notif_rows if r["status"] == "failed"),
        "sent_today": sum(
            1
            for r in notif_rows
            if r["status"] == "sent" and str(r["created_at"])[:10] == today
        ),
    }

    # Get recent Audit Logs (max 5)
    recent_logs_res = search_paginated("audit_log", per_page=5, order="created_at.desc")
    recent_logs = recent_logs_res.get("data", [])

    return {
        "stats": stats,
        "notifications": notifications,
        "active_wave": active_wave,
        "recent_logs": recent_logs,
        "trend": trend,
        "trend_delta": delta,
    }


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1),
    per_page: int = Query(20),
    search: str = Query(""),
    entity_type: str = Query(""),
    action: str = Query(""),
    user: dict[str, Any] = Depends(require_superadmin),
):
    """Riwayat aktivitas (audit log) dengan pencarian, filter, dan paginasi."""
    filters: dict[str, Any] = {}
    if entity_type:
        filters["entity_type"] = entity_type
    if action:
        filters["action"] = action

    res = search_paginated(
        "audit_log",
        search=search,
        columns=["user_username", "action", "entity_type", "entity_id"],
        page=page,
        per_page=per_page,
        order="created_at.desc",
        filters=filters or None,
    )

    logs = [
        {
            "id": r.get("id"),
            "user_id": r.get("user_id"),
            "user_username": r.get("user_username"),
            "action": r.get("action"),
            "entity_type": r.get("entity_type"),
            "entity_id": r.get("entity_id"),
            "changes": _parse_changes(r.get("changes")),
            "ip_address": r.get("ip_address"),
            "created_at": r.get("created_at"),
        }
        for r in res.get("data", [])
    ]

    entity_types = [
        r["k"]
        for r in execute_raw(
            "SELECT DISTINCT `entity_type` AS `k` FROM `audit_log` "
            "ORDER BY `entity_type`"
        )
        or []
    ]
    actions = [
        r["k"]
        for r in execute_raw(
            "SELECT DISTINCT `action` AS `k` FROM `audit_log` ORDER BY `action`"
        )
        or []
    ]

    return {
        "data": logs,
        "total": res.get("total", 0),
        "page": page,
        "per_page": per_page,
        "entity_types": entity_types,
        "actions": actions,
    }
