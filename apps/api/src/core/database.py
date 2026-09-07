import json
import logging
import os
import re
from datetime import datetime
from typing import Any, cast
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import URL, MetaData, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from src.core.config import settings

logger = logging.getLogger(__name__)

WIB = ZoneInfo("Asia/Jakarta")

# Tables whose PK column is `key` instead of `id`.
PK_TABLES = {"site_settings"}
# Tables that have no `updated_at` column.
NO_UPDATED_AT = {
    "refresh_tokens",
    "audit_log",
    "user_page_permissions",
    "file_uploads",
    "rate_limits",
    "notification_logs",
}

_IDENT_RE = re.compile(r"^[A-Za-z0-9_]+$")

_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def _require_ident(name: str) -> str:
    """Guard against SQL injection through table/column identifiers."""
    if not _IDENT_RE.match(name):
        raise ValueError(f"Invalid identifier: {name}")
    return name


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        # --- SQLite / custom DATABASE_URL override (local dev) ---
        if settings.database_url:
            from sqlalchemy.pool import StaticPool

            _engine = create_engine(
                settings.database_url,
                connect_args={"check_same_thread": False}
                if "sqlite" in settings.database_url
                else {},
                poolclass=StaticPool if "sqlite" in settings.database_url else None,
            )
            return _engine

        # --- MySQL (production / default) ---
        url = URL.create(
            drivername="mysql+pymysql",
            username=settings.mysql_user,
            password=settings.mysql_password,
            host=settings.mysql_host,
            port=settings.mysql_port,
            database=settings.mysql_database,
        )
        connect_args: dict[str, Any] = {"charset": "utf8mb4"}
        if settings.mysql_ssl:
            connect_args["ssl"] = {}

        if os.getenv("VERCEL"):
            _engine = create_engine(
                url,
                poolclass=NullPool,
                connect_args=connect_args,
            )
        else:
            _engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=280,
                pool_size=5,
                max_overflow=10,
                connect_args=connect_args,
            )
    return _engine


def get_raw_pool() -> Engine:
    return get_engine()


def get_sessionmaker() -> sessionmaker:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(), autoflush=False, expire_on_commit=False
        )
    return _SessionLocal


def get_db():
    db = get_sessionmaker()()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


def _run(sql: str, params: dict[str, Any] | None = None) -> Any:
    """Execute a statement on the engine pool and return rows or rowcount."""
    with get_engine().connect() as conn:
        result = conn.execute(text(sql), params or {})
        conn.commit()
        if result.returns_rows:
            return [dict(r._mapping) for r in result]
        return result.rowcount


def execute_raw(sql: str, params: dict[str, Any] | None = None) -> Any:
    return _run(sql, params)


def utcnow() -> str:
    """Current WIB time formatted for MySQL DATETIME columns."""
    return datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S")


def _pk_col(table: str) -> str:
    return "`key`" if table in PK_TABLES else "id"


def _prepare_value(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, dict | list | tuple):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, bool):
        return 1 if val else 0
    return val


def list_all(
    table: str, order: str | None = None, limit: int = 100, skip: int = 0
) -> list[dict[str, Any]]:
    sql = f"SELECT * FROM `{_require_ident(table)}`"
    if order:
        parts = order.split(".")
        col = parts[0]
        direction = "DESC" if len(parts) > 1 and parts[1] == "desc" else "ASC"
        sql += f" ORDER BY `{_require_ident(col)}` {direction}"
    sql += f" LIMIT {int(limit)} OFFSET {int(skip)}"
    return cast(list[dict[str, Any]], _run(sql))


def get_by_id(table: str, id: str) -> dict[str, Any] | None:
    if not id:
        return None
    col = _pk_col(table)
    sql = f"SELECT * FROM `{_require_ident(table)}` WHERE {col} = :id LIMIT 1"
    rows = _run(sql, {"id": id})
    return rows[0] if rows else None


def get_by_column(table: str, column: str, value: Any) -> dict[str, Any] | None:
    sql = (
        f"SELECT * FROM `{_require_ident(table)}` "
        f"WHERE `{_require_ident(column)}` = :value LIMIT 1"
    )
    rows = _run(sql, {"value": value})
    return rows[0] if rows else None


def get_by_slug(table: str, slug: str) -> dict[str, Any] | None:
    sql = f"SELECT * FROM `{_require_ident(table)}` WHERE slug = :slug LIMIT 1"
    rows = _run(sql, {"slug": slug})
    return rows[0] if rows else None


def get_first(table: str) -> dict[str, Any] | None:
    sql = f"SELECT * FROM `{_require_ident(table)}` LIMIT 1"
    rows = _run(sql)
    return rows[0] if rows else None


def create_record(
    table: str, data: dict[str, Any], return_row: bool = True
) -> dict[str, Any]:
    payload = dict(data)
    if table not in PK_TABLES and "id" not in payload:
        payload["id"] = str(uuid4())
    if table not in NO_UPDATED_AT:
        now = utcnow()
        payload.setdefault("created_at", now)
        payload.setdefault("updated_at", now)
    else:
        payload.setdefault("created_at", utcnow())

    cleaned = {k: _prepare_value(v) for k, v in payload.items()}
    keys = list(cleaned.keys())
    placeholders = ", ".join(f":{k}" for k in keys)
    cols = ", ".join(f"`{_require_ident(k)}`" for k in keys)
    sql = f"INSERT INTO `{_require_ident(table)}` ({cols}) VALUES ({placeholders})"
    _run(sql, cleaned)

    if table in PK_TABLES or not return_row:
        return cleaned
    row = get_by_id(table, cleaned["id"])
    if row is None:
        return cleaned
    return row


def update_record(table: str, id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    if not id:
        return None
    payload = dict(data)
    if table not in NO_UPDATED_AT:
        payload["updated_at"] = utcnow()

    cleaned = {k: _prepare_value(v) for k, v in payload.items()}
    keys = list(cleaned.keys())
    set_clause = ", ".join(f"`{_require_ident(k)}` = :{k}" for k in keys)
    col = _pk_col(table)
    sql = f"UPDATE `{_require_ident(table)}` SET {set_clause} WHERE {col} = :_row_id"
    cleaned["_row_id"] = id
    _run(sql, cleaned)
    return get_by_id(table, id)


def delete_record(table: str, id: str) -> bool:
    if not id:
        return False
    col = _pk_col(table)
    sql = f"DELETE FROM `{_require_ident(table)}` WHERE {col} = :id"
    return cast(bool, _run(sql, {"id": id}) > 0)


def search_paginated(
    table: str,
    search: str = "",
    columns: list[str] | None = None,
    page: int = 1,
    per_page: int = 20,
    order: str | None = None,
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    offset = (page - 1) * per_page
    where_clause = ""
    params_dict: dict[str, Any] = {}

    if search and columns:
        or_clauses = " OR ".join(
            f"`{_require_ident(c)}` LIKE :search_pattern" for c in columns
        )
        where_clause = f"WHERE ({or_clauses})"
        escaped_search = search.replace("%", "\\%").replace("_", "\\_")
        params_dict["search_pattern"] = f"%{escaped_search}%"

    if filters:
        filter_clauses = []
        for i, (col, val) in enumerate(filters.items()):
            if val is not None:
                if isinstance(val, list | tuple):
                    if val:
                        ph_list = []
                        for j, item in enumerate(val):
                            ph_key = f"in_{i}_{j}"
                            ph_list.append(f":{ph_key}")
                            params_dict[ph_key] = item
                        placeholders = ", ".join(ph_list)
                        filter_clauses.append(
                            f"`{_require_ident(col)}` IN ({placeholders})"
                        )
                    else:
                        filter_clauses.append("1 = 0")
                else:
                    ph_key = f"eq_{i}"
                    filter_clauses.append(f"`{_require_ident(col)}` = :{ph_key}")
                    params_dict[ph_key] = val
        if filter_clauses:
            joined = " AND ".join(filter_clauses)
            where_clause = (
                f"{where_clause} AND {joined}" if where_clause else f"WHERE {joined}"
            )

    count_sql = (
        f"SELECT COUNT(*) AS total FROM `{_require_ident(table)}` {where_clause}"
    )
    count_rows = _run(count_sql, params_dict)
    total = int(count_rows[0]["total"]) if count_rows else 0

    data_sql = f"SELECT * FROM `{_require_ident(table)}` {where_clause}"
    if order:
        parts = order.split(".")
        col = parts[0]
        direction = "DESC" if len(parts) > 1 and parts[1] == "desc" else "ASC"
        data_sql += f" ORDER BY `{_require_ident(col)}` {direction}"
    data_sql += f" LIMIT {int(per_page)} OFFSET {int(offset)}"
    data = _run(data_sql, params_dict)

    return {"data": data, "total": total}


def audit_log(
    user_id: str | None,
    user_username: str | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    changes: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    try:
        create_record(
            "audit_log",
            {
                "user_id": user_id,
                "user_username": user_username,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "changes": json.dumps(changes, ensure_ascii=False)
                if changes is not None
                else None,
                "ip_address": ip_address,
            },
        )
    except Exception:
        logger.exception("audit_log failed")
