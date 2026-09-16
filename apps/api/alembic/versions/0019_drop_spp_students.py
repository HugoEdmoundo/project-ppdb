# mypy: ignore-errors
"""Drop unused legacy SPP & students tables

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-14 12:00:00.000000

`students`, `spp_bills`, `spp_payments` and `spp_settings` were an
abandoned SPP/student feature (introduced in 0008) that no router or
service ever uses. The ORM models are removed; this migration drops the
tables themselves.
"""

from collections.abc import Sequence

from alembic import op  # type: ignore[attr-defined]

# revision identifiers, used by Alembic.
revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Drop in dependency order (children before parents to satisfy FK).
_TABLES: list[str] = ["spp_payments", "spp_bills", "spp_settings", "students"]


def _existing_tables() -> set:
    import sqlalchemy as sa

    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    bind = op.get_bind()
    existing = _existing_tables()
    tables = [t for t in _TABLES if t in existing]
    if not tables:
        return
    if bind.dialect.name == "mysql":
        op.execute("SET FOREIGN_KEY_CHECKS = 0")
        try:
            for table in tables:
                op.drop_table(table)
        finally:
            op.execute("SET FOREIGN_KEY_CHECKS = 1")
    else:
        for table in tables:
            op.drop_table(table)


def downgrade() -> None:
    # Cannot restore the abandoned tables without their DDL; leave as-is.
    pass
