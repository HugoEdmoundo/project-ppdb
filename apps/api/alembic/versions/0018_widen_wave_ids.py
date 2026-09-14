"""Widen wave_id columns to fit prefixed UUIDs

Revision ID: 0018
Revises: 0017
Create Date: 2026-09-11 12:00:00.000000

`ppdb_waves.id` is generated as `wave-{uuid}` (41 chars) and declared
VARCHAR(50), but the referencing `wave_id` columns were declared
VARCHAR(36). On MySQL strict mode the INSERTs fail with
"Data too long for column 'wave_id'". Widen all impacted columns to
VARCHAR(50).

SQLite dev uses the same columns but ignores length, so those ALTERs are
no-ops there (handled via batch mode for compatibility).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, column, nullable) triples referencing ppdb_waves(id)
_WAVE_FK_COLUMNS: list[tuple[str, str, bool]] = [
    ("ppdb_applicants", "wave_id", False),
    ("ppdb_wave_fee_items", "wave_id", False),
    ("selection_sessions", "wave_id", False),
    ("selection_categories", "wave_id", False),
]


def _alter_type(table: str, column: str, nullable: bool, new: int, old: int) -> None:
    """Widen ``column`` to ``new`` chars on MySQL, batch-mode on SQLite."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                type_=sa.String(new),
                existing_type=sa.String(old),
                existing_nullable=nullable,
            )
    else:
        op.alter_column(
            table,
            column,
            type_=sa.String(new),
            existing_type=sa.String(old),
            existing_nullable=nullable,
        )


def _drop_wave_fks() -> list[dict]:
    """Drop FKs referencing ppdb_waves(id) on MySQL; return them for restore."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    dropped: list[dict] = []
    for table, col, _ in _WAVE_FK_COLUMNS:
        for fk in inspector.get_foreign_keys(table):
            if fk.get("referred_table") == "ppdb_waves" and col in fk.get(
                "constrained_columns", []
            ):
                name = fk["name"]
                op.execute(sa.text(f"ALTER TABLE {table} DROP FOREIGN KEY `{name}`"))
                dropped.append(
                    {
                        "name": name,
                        "table": table,
                        "col": col,
                        "ondelete": fk.get("ondelete"),
                        "onupdate": fk.get("onupdate"),
                    }
                )
    return dropped


def _restore_wave_fks(dropped: list[dict]) -> None:
    for fk in dropped:
        op.create_foreign_key(
            fk["name"],
            fk["table"],
            "ppdb_waves",
            [fk["col"]],
            ["id"],
            ondelete=fk.get("ondelete"),
            onupdate=fk.get("onupdate"),
        )


def upgrade() -> None:
    bind = op.get_bind()

    dropped: list[dict] = []
    if bind.dialect.name == "mysql":
        dropped = _drop_wave_fks()

    for table, col, nullable in _WAVE_FK_COLUMNS:
        _alter_type(table, col, nullable, 50, 36)

    if bind.dialect.name == "mysql":
        _restore_wave_fks(dropped)


def downgrade() -> None:
    bind = op.get_bind()

    dropped: list[dict] = []
    if bind.dialect.name == "mysql":
        dropped = _drop_wave_fks()

    for table, col, nullable in _WAVE_FK_COLUMNS:
        _alter_type(table, col, nullable, 36, 50)

    if bind.dialect.name == "mysql":
        _restore_wave_fks(dropped)
