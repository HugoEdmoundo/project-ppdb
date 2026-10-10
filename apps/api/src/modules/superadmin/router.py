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
    """Resolve satu gelombang aktif (system-wide) + jumlah pendaftar."""
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


def _applicant_scope_clause(
    period_id: str | None, wave_id: str | None
) -> tuple[str, dict[str, Any]]:
    """Bentuk klausa WHERE + params untuk menyaring pendaftar per periode/gelombang.

    Default (keduanya None) = seluruh pendaftar dari semua periode & gelombang.
    """
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if period_id:
        clauses.append(
            "`wave_id` IN (SELECT `id` FROM `ppdb_waves` "
            "WHERE `period_id` = :period_id)"
        )
        params["period_id"] = period_id

    if wave_id:
        clauses.append("`wave_id` = :wave_id")
        params["wave_id"] = wave_id

    return ("".join(f" AND {c}" for c in clauses), params)


def _applicants_by_period() -> list[dict[str, Any]]:
    """Jumlah pendaftar per periode — label asal untuk dashboard Superadmin."""
    rows = (
        execute_raw(
            "SELECT `p`.`id` AS `period_id`, `p`.`name` AS `period_name`, "
            "`p`.`status` AS `period_status`, `p`.`academic_year` AS `academic_year`, "
            "COUNT(`a`.`id`) AS `total` "
            "FROM `ppdb_periods` `p` "
            "LEFT JOIN `ppdb_waves` `w` ON `w`.`period_id` = `p`.`id` "
            "LEFT JOIN `ppdb_applicants` `a` ON `a`.`wave_id` = `w`.`id` "
            "GROUP BY `p`.`id`, `p`.`name`, `p`.`status`, `p`.`academic_year` "
            "ORDER BY `p`.`created_at` DESC"
        )
        or []
    )
    return [
        {
            "id": str(r["period_id"]),
            "name": r["period_name"],
            "status": r["period_status"],
            "academic_year": r["academic_year"],
            "total": int(r["total"] or 0),
        }
        for r in rows
    ]


def _applicants_by_wave(period_id: str | None = None) -> list[dict[str, Any]]:
    """Jumlah pendaftar per gelombang, dengan label periode induknya."""
    where = " WHERE `w`.`period_id` = :period_id" if period_id else ""
    params: dict[str, Any] = {"period_id": period_id} if period_id else {}
    rows = (
        execute_raw(
            "SELECT `w`.`id` AS `wave_id`, `w`.`name` AS `wave_name`, "
            "`w`.`status` AS `wave_status`, `w`.`quota` AS `quota`, "
            "`p`.`id` AS `period_id`, `p`.`name` AS `period_name`, "
            "COUNT(`a`.`id`) AS `total` "
            "FROM `ppdb_waves` `w` "
            "INNER JOIN `ppdb_periods` `p` ON `p`.`id` = `w`.`period_id` "
            "LEFT JOIN `ppdb_applicants` `a` ON `a`.`wave_id` = `w`.`id` "
            f"{where} "
            "GROUP BY `w`.`id`, `w`.`name`, `w`.`status`, `w`.`quota`, "
            "`p`.`id`, `p`.`name` "
            "ORDER BY `p`.`created_at` DESC, `w`.`wave_number` ASC",
            params,
        )
        or []
    )
    return [
        {
            "id": str(r["wave_id"]),
            "name": r["wave_name"],
            "status": r["wave_status"],
            "quota": int(r["quota"] or 0),
            "period_id": str(r["period_id"]),
            "period_name": r["period_name"],
            "total": int(r["total"] or 0),
        }
        for r in rows
    ]


def _build_trend_with_delta(
    days: int = 30, wave_id: str | None = None, period_id: str | None = None
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Registrasi pendaftar per hari untuk ``days`` terakhir + delta jumlah
    registrasi dibandingkan ``days`` hari sebelumnya.

    Tanpa ``wave_id``/``period_id`` seluruh periode ikut dihitung (default
    Superadmin). Cross-DB aware: hanya SELECT kolom ``created_at`` lalu di-bucket
    di Python supaya bekerja di MySQL dan SQLite tanpa fungsi tanggal spesifik DB.
    """
    start = datetime.now(WIB) - timedelta(days=(2 * days) - 1)
    scope_clause, scope_params = _applicant_scope_clause(period_id, wave_id)
    params: dict[str, Any] = {
        "start": start.strftime("%Y-%m-%d"),
        **scope_params,
    }
    rows = execute_raw(
        "SELECT `created_at` FROM `ppdb_applicants` "
        f"WHERE `created_at` >= :start{scope_clause}",
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
def get_dashboard(
    period_id: str | None = Query(None),
    wave_id: str | None = Query(None),
    user: dict[str, Any] = Depends(require_superadmin),
):
    total_users_res = search_paginated("users", per_page=1)
    total_users = total_users_res.get("total", 0)

    total_roles_res = search_paginated("roles", per_page=1)
    total_roles = total_roles_res.get("total", 0)

    # Metrik PPDB: seluruh pendaftar dari semua periode & gelombang secara
    # default. Filter periode/gelombang bersifat opsional untuk mempersempit.
    active_wave_id, active_wave = _get_active_wave()
    scope_clause, scope_params = _applicant_scope_clause(period_id, wave_id)

    total_applicants = _count_where(
        "ppdb_applicants", f"1=1{scope_clause}", scope_params
    )
    applicants_by_payment = _group_counts(
        "ppdb_applicants",
        "payment_status",
        f"1=1{scope_clause}",
        scope_params,
    )
    applicants_by_status = _group_counts(
        "ppdb_applicants",
        "status",
        f"1=1{scope_clause}",
        scope_params,
    )
    trend, delta = _build_trend_with_delta(wave_id=wave_id, period_id=period_id)

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
        "applicants_by_status": applicants_by_status,
        "applicants_new_30d": delta["current"],
        "applicants_by_period": _applicants_by_period(),
        "applicants_by_wave": _applicants_by_wave(period_id),
        "total_applicants_all_periods": _count_where("ppdb_applicants", "1=1"),
    }

    notif_rows = (
        execute_raw(
            "SELECT `status`, COUNT(*) AS `n`, "
            "SUM(CASE WHEN DATE(`created_at`) = CURDATE() "
            "AND `status` = 'sent' THEN 1 ELSE 0 END) AS `today_sent` "
            "FROM `notification_logs` GROUP BY `status`"
        )
        or []
    )
    notif_by_status: dict[str, int] = {r["status"]: int(r["n"]) for r in notif_rows}
    sent_today = sum(
        int(r.get("today_sent", 0)) for r in notif_rows if r["status"] == "sent"
    )
    notifications = {
        "sent": notif_by_status.get("sent", 0),
        "failed": notif_by_status.get("failed", 0),
        "sent_today": sent_today,
    }

    # Get recent Audit Logs (max 5)
    recent_logs_res = search_paginated("audit_log", per_page=5, order="created_at.desc")
    recent_logs = recent_logs_res.get("data", [])

    return {
        "stats": stats,
        "notifications": notifications,
        "active_wave": active_wave,
        "scope": {
            "period_id": period_id,
            "wave_id": wave_id,
            "filtered": bool(period_id or wave_id),
            "active_wave_id": active_wave_id,
        },
        "recent_logs": recent_logs,
        "trend": trend,
        "trend_delta": delta,
    }


@router.get("/periods")
def list_periods(user: dict[str, Any] = Depends(require_superadmin)):
    """Daftar periode ringkas untuk filter dashboard Superadmin."""
    rows = (
        execute_raw(
            "SELECT `id`, `name`, `status`, `academic_year` FROM `ppdb_periods` "
            "ORDER BY `created_at` DESC"
        )
        or []
    )
    return {
        "data": [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "status": r["status"],
                "academic_year": r["academic_year"],
            }
            for r in rows
        ]
    }


@router.get("/waves")
def list_waves(
    period_id: str | None = Query(None),
    user: dict[str, Any] = Depends(require_superadmin),
):
    """Daftar gelombang ringkas (opsional difilter per periode)."""
    return {"data": _applicants_by_wave(period_id)}


@router.get("/whatsapp-contacts")
def list_whatsapp_contacts(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: dict[str, Any] = Depends(require_superadmin),
):
    """Kontak tujuan chat WhatsApp: semua user + pendaftar yang punya nomor HP.

    Pendaftar dulu (paling sering dikontak), lalu user non-pendaftar
    (admin/panitia). Pendaftar membawa label periode & gelombang.
    """
    params: dict[str, Any] = {}
    # Pendaftar: wajib punya nomor (dipakai untuk kirim WA).
    applicant_filter = " WHERE `a`.`phone` IS NOT NULL AND `a`.`phone` <> ''"
    # User non-pendaftar (admin/panitia): WAHOSTPHONE + user_type-nya HARUS
    # selalu dibatasi, kalau tidak maka tanpa `search` semua user ikut
    # termuat — termasuk pendaftar (duplikat) dan user tanpa nomor.
    user_filter = (
        " WHERE COALESCE(`user_type`, '') <> 'applicant' "
        " AND `phone` IS NOT NULL AND `phone` <> ''"
    )
    if search:
        params["q"] = f"%{search}%"
        applicant_filter += (
            " AND (`a`.`full_name` LIKE :q OR `a`.`phone` LIKE :q "
            "      OR `a`.`email` LIKE :q OR `u`.`username` LIKE :q)"
        )
        user_filter += (
            " AND (`full_name` LIKE :q OR `phone` LIKE :q "
            "      OR `email` LIKE :q OR `username` LIKE :q)"
        )

    applicant_rows = execute_raw(
        "SELECT `a`.`id` AS `id`, `a`.`full_name` AS `name`, `a`.`phone` AS `phone`, "
        "`a`.`email` AS `email`, `a`.`created_at` AS `created_at`, "
        "`u`.`username` AS `username`, "
        "`w`.`name` AS `wave_name`, `p`.`name` AS `period_name` "
        "FROM `ppdb_applicants` `a` "
        "LEFT JOIN `users` `u` ON `u`.`id` = `a`.`user_id` "
        "LEFT JOIN `ppdb_waves` `w` ON `w`.`id` = `a`.`wave_id` "
        "LEFT JOIN `ppdb_periods` `p` ON `p`.`id` = `w`.`period_id`"
        f"{applicant_filter} "
        "ORDER BY `a`.`created_at` DESC",
        params,
    )

    user_rows = execute_raw(
        "SELECT `id`, `full_name` AS `name`, `phone`, `email`, `username`, "
        "`created_at` "
        "FROM `users`"
        f"{user_filter} "
        "ORDER BY `created_at` DESC LIMIT 200"
    )

    contacts: list[dict[str, Any]] = [
        {
            "id": str(r["id"]),
            "user_id": None,
            "name": r["name"],
            "phone": r["phone"],
            "email": r["email"],
            "username": r.get("username"),
            "kind": "applicant",
            "period_name": r.get("period_name"),
            "wave_name": r.get("wave_name"),
            "created_at": r.get("created_at"),
        }
        for r in (applicant_rows or [])
    ]
    contacts += [
        {
            "id": f"user-{r['id']}",
            "user_id": str(r["id"]),
            "name": r["name"],
            "phone": r["phone"],
            "email": r["email"],
            "username": r.get("username"),
            "kind": "user",
            "period_name": None,
            "wave_name": None,
            "created_at": r.get("created_at"),
        }
        for r in (user_rows or [])
    ]

    total = len(contacts)
    offset = (page - 1) * per_page
    return {
        "data": contacts[offset : offset + per_page],
        "total": total,
        "page": page,
        "perPage": per_page,
        "totalPages": max(1, -(-total // per_page)),
    }


@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
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
