# mypy: ignore-errors
"""add address fields (portable + idempotent rewrite)

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-18 10:23:24.851603

The original version of this migration emitted raw MySQL ``ALTER TABLE``
statements (``MODIFY COLUMN``, ``DROP INDEX IF EXISTS``, ...) that crash on a
fresh SQLite database. This rewrite reflects the live schema first and only
applies changes that are actually missing, using ``batch_alter_table`` so the
same code runs on MySQL production and SQLite development databases.

Every operation is guarded: if the target table/column/constraint does not
exist (or already matches), nothing happens. A fresh database created from
0001 is therefore left untouched, while a legacy MySQL database is still
reconciled toward the current model.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _tables() -> set[str]:
    return {t for t in sa.inspect(op.get_bind()).get_table_names()}


def _has_table(name: str) -> bool:
    return name in _tables()


def _columns(table: str) -> set[str]:
    if not _has_table(table):
        return set()
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _has_column(table: str, column: str) -> bool:
    return column in _columns(table)


def _column_info(table: str, column: str) -> dict | None:
    for c in sa.inspect(op.get_bind()).get_columns(table):
        if c["name"] == column:
            return c
    return None


def _type_base(coltype) -> str:
    """Normalize a reflected type to a comparable base name."""
    name = str(coltype).upper()
    base = name.split("(")[0]
    if base in ("INTEGER", "INT"):
        return "INT"
    return base


def _add_column(table: str, column) -> None:
    if not _has_column(table, column.name):
        with op.batch_alter_table(table) as batch:
            batch.add_column(column)


def _drop_column(table: str, column: str) -> None:
    if _has_column(table, column):
        with op.batch_alter_table(table) as batch:
            batch.drop_column(column)


def _alter_column(
    table: str,
    column: str,
    *,
    type_=None,
    nullable: bool | None = None,
    server_default=None,
) -> None:
    """Alter `column` only when nullable/type/default actually differ."""
    if not _has_column(table, column):
        return
    current = _column_info(table, column)
    if current is None:
        return

    changes: dict = {}
    if type_ is not None and _type_base(current["type"]) != _type_base(type_):
        changes["type_"] = type_
        changes["existing_type"] = current["type"]
    if nullable is not None and bool(current["nullable"]) != bool(nullable):
        changes["nullable"] = nullable
        changes["existing_nullable"] = bool(current["nullable"])

    if server_default is not None:
        existing = current.get("default")
        if (
            existing is None
            or str(existing).replace("'", "").upper()
            != str(server_default).replace("'", "").upper()
        ):
            # Server-side defaults are only reconciled on MySQL; SQLite dev
            # databases already carry the model-level defaults.
            if op.get_bind().dialect.name == "mysql":
                changes["server_default"] = server_default
                changes["existing_server_default"] = existing

    if not changes:
        return
    with op.batch_alter_table(table) as batch:
        batch.alter_column(column, **changes)


def _has_index(table: str, index: str) -> bool:
    if not _has_table(table):
        return False
    return index in {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table)}


def _create_index(table: str, index: str, columns: list[str]) -> None:
    if _has_index(table, index):
        return
    with op.batch_alter_table(table) as batch:
        batch.create_index(index, columns)


def _drop_index(table: str, index: str) -> None:
    if not _has_index(table, index):
        return
    with op.batch_alter_table(table) as batch:
        batch.drop_index(index)


def _has_unique(table: str, column: str) -> bool:
    if not _has_table(table):
        return False
    inspector = sa.inspect(op.get_bind())
    for u in inspector.get_unique_constraints(table):
        if column in (u.get("column_names") or []):
            return True
    return False


def _add_unique(table: str, column: str) -> None:
    if _has_unique(table, column):
        return
    with op.batch_alter_table(table) as batch:
        batch.create_unique_constraint(f"uq_{table}_{column}", [column])


def _has_fk(table: str, column: str, referred_table: str) -> bool:
    if not _has_table(table):
        return False
    inspector = sa.inspect(op.get_bind())
    for fk in inspector.get_foreign_keys(table):
        if (
            column in (fk.get("constrained_columns") or [])
            and fk.get("referred_table") == referred_table
        ):
            return True
    return False


def _add_fk(
    table: str, column: str, referred_table: str, ondelete: str | None = None
) -> None:
    if _has_fk(table, column, referred_table):
        return
    with op.batch_alter_table(table) as batch:
        batch.create_foreign_key(
            f"fk_{table}_{column}_{referred_table}",
            column,
            referred_table,
            ["id"],
            ondelete=ondelete,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Migration
# ─────────────────────────────────────────────────────────────────────────────


def upgrade() -> None:
    # ── audit_log ─────────────────────────────────────────────────────────
    _alter_column(
        "audit_log",
        "created_at",
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP(3)"),
    )
    for idx in ("idx_audit_log_created", "idx_audit_log_entity", "idx_audit_log_user"):
        _drop_index("audit_log", idx)
    for idx in ("ix_audit_log_created_at", "ix_audit_log_user_id"):
        _drop_index("audit_log", idx)
    _create_index("audit_log", "ix_audit_log_created_at", ["created_at"])
    _create_index("audit_log", "ix_audit_log_user_id", ["user_id"])
    _add_fk("audit_log", "user_id", "users", ondelete="SET NULL")

    # ── file_uploads ──────────────────────────────────────────────────────
    _alter_column("file_uploads", "entity_type", type_=sa.String(50))
    for idx in ("idx_file_uploads_entity", "idx_file_uploads_uploaded_by"):
        _drop_index("file_uploads", idx)
    _add_fk("file_uploads", "uploaded_by", "users", ondelete="CASCADE")

    # ── modules ───────────────────────────────────────────────────────────
    _drop_index("modules", "uk_modules_key")
    _add_unique("modules", "key")

    # ── news_articles ─────────────────────────────────────────────────────
    for idx in ("idx_news_articles_slug", "ix_news_articles_slug"):
        _drop_index("news_articles", idx)
    _create_index("news_articles", "ix_news_articles_slug", ["slug"])

    # ── notification_logs ─────────────────────────────────────────────────
    _alter_column("notification_logs", "id", nullable=False)
    _drop_column("notification_logs", "updated_at")

    # ── pages ─────────────────────────────────────────────────────────────
    _alter_column(
        "pages", "icon", type_=sa.String(50), nullable=False, server_default="''"
    )
    _alter_column(
        "pages", "sort_order", type_=sa.Integer(), nullable=False, server_default="0"
    )
    _drop_index("pages", "uk_pages_module_key")
    _add_fk("pages", "module_id", "modules", ondelete="CASCADE")

    # ── ppdb_applicants (new address columns + type changes) ──────────────
    for name_, col in [
        ("province", sa.Column("province", sa.String(100), nullable=True)),
        ("city", sa.Column("city", sa.String(100), nullable=True)),
        ("district", sa.Column("district", sa.String(100), nullable=True)),
        ("village", sa.Column("village", sa.String(100), nullable=True)),
        ("postal_code", sa.Column("postal_code", sa.String(20), nullable=True)),
    ]:
        _add_column("ppdb_applicants", col)
    _alter_column("ppdb_applicants", "id", type_=sa.String(36), nullable=False)
    _alter_column("ppdb_applicants", "wave_id", type_=sa.String(36), nullable=False)
    _alter_column(
        "ppdb_applicants",
        "status",
        type_=sa.String(50),
        nullable=False,
        server_default="pending_payment",
    )
    _add_fk("ppdb_applicants", "wave_id", "ppdb_waves")

    # ── ppdb_payment_transactions ─────────────────────────────────────────
    _alter_column(
        "ppdb_payment_transactions", "id", type_=sa.String(36), nullable=False
    )
    _alter_column(
        "ppdb_payment_transactions",
        "applicant_id",
        type_=sa.String(36),
        nullable=False,
    )
    _add_fk(
        "ppdb_payment_transactions",
        "applicant_id",
        "ppdb_applicants",
        ondelete="CASCADE",
    )

    # ── ppdb_periods ──────────────────────────────────────────────────────
    _alter_column(
        "ppdb_periods",
        "status",
        type_=sa.String(20),
        nullable=False,
        server_default="inactive",
    )

    # ── ppdb_waves ────────────────────────────────────────────────────────
    _alter_column(
        "ppdb_waves", "quota", type_=sa.Integer(), nullable=False, server_default="0"
    )
    _alter_column(
        "ppdb_waves",
        "status",
        type_=sa.String(20),
        nullable=False,
        server_default="inactive",
    )
    _drop_index("ppdb_waves", "period_id")
    _add_fk("ppdb_waves", "period_id", "ppdb_periods", ondelete="CASCADE")

    # ── programs ──────────────────────────────────────────────────────────
    for idx in ("idx_programs_slug", "ix_programs_slug"):
        _drop_index("programs", idx)
    _create_index("programs", "ix_programs_slug", ["slug"])

    # ── rate_limits ───────────────────────────────────────────────────────
    _drop_index("rate_limits", "idx_key")

    # ── refresh_tokens ────────────────────────────────────────────────────
    _alter_column(
        "refresh_tokens",
        "revoked",
        type_=sa.Boolean(),
        nullable=False,
        server_default="0",
    )
    _alter_column(
        "refresh_tokens",
        "created_at",
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP(3)"),
    )
    for idx in ("idx_refresh_tokens_hash", "idx_refresh_tokens_user"):
        _drop_index("refresh_tokens", idx)
    for idx in ("ix_refresh_tokens_user_id", "ix_refresh_tokens_user"):
        _drop_index("refresh_tokens", idx)
    _create_index("refresh_tokens", "ix_refresh_tokens_user_id", ["user_id"])
    _add_fk("refresh_tokens", "user_id", "users", ondelete="CASCADE")

    # ── roles ─────────────────────────────────────────────────────────────
    _alter_column(
        "roles", "is_superadmin", type_=sa.Boolean(), nullable=False, server_default="0"
    )
    for idx in ("uk_roles_name",):
        _drop_index("roles", idx)
    _add_unique("roles", "name")

    # ── user_page_permissions ─────────────────────────────────────────────
    for idx in ("uk_user_page", "ix_user_page_permissions_user_id"):
        _drop_index("user_page_permissions", idx)
    _add_fk("user_page_permissions", "user_id", "users", ondelete="CASCADE")

    # ── users ─────────────────────────────────────────────────────────────
    _alter_column(
        "users", "email", type_=sa.String(255), nullable=False, server_default="''"
    )
    _alter_column(
        "users",
        "user_type",
        type_=sa.String(50),
        nullable=False,
        server_default="admin",
    )
    _alter_column(
        "users", "is_active", type_=sa.Boolean(), nullable=False, server_default="1"
    )
    _alter_column(
        "users", "full_name", type_=sa.String(255), nullable=False, server_default="''"
    )
    _alter_column(
        "users", "avatar_url", type_=sa.String(255), nullable=False, server_default="''"
    )
    _alter_column(
        "users",
        "failed_login_attempts",
        type_=sa.Integer(),
        nullable=False,
        server_default="0",
    )
    for idx in ("idx_users_role_id", "uk_users_email", "uk_users_username"):
        _drop_index("users", idx)
    _create_index("users", "ix_users_role_id", ["role_id"])
    _add_unique("users", "email")
    _add_unique("users", "username")
    _add_fk("users", "role_id", "roles")


def downgrade() -> None:
    pass
