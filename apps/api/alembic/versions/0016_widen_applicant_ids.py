# mypy: ignore-errors
"""Widen applicant/payment IDs to fit prefixed UUIDs

Revision ID: 0016
Revises: 0015
Create Date: 2026-09-05 12:00:00.000000

`ppdb_applicants.id` is generated as `applicant-{uuid}` (46 chars) and
`ppdb_payment_transactions.id` as `pay-{uuid}` (40 chars), but both columns
were declared VARCHAR(36). On MySQL strict mode the INSERTs fail with
"Data too long for column 'id'". Widen all impacted columns (and the FK
columns that reference ppdb_applicants.id) to VARCHAR(64).

SQLite dev uses the same columns but ignores length, so those ALTERs are
no-ops there (handled via batch mode for compatibility).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# child tables whose applicant_id column references ppdb_applicants.id (with FK)
_APPLICANT_FK_CHILDREN: dict[str, str] = {
    "ppdb_payment_transactions": "applicant_id",
    "ppdb_applicant_discounts": "applicant_id",
    "ppdb_stage2_bills": "applicant_id",
    "ppdb_mou": "applicant_id",
}


def _alter_type(table: str, column: str, nullable: bool) -> None:
    """Widen ``column`` to VARCHAR(64) on MySQL, batch-mode on SQLite."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                column,
                type_=sa.String(64),
                existing_type=sa.String(36),
                existing_nullable=nullable,
            )
    else:
        op.alter_column(
            table,
            column,
            type_=sa.String(64),
            existing_type=sa.String(36),
            existing_nullable=nullable,
        )


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "mysql":
        # ── Drop FKs referencing ppdb_applicants(id) before widening ──────
        inspector = sa.inspect(bind)
        dropped: list[dict] = []
        for table, col in _APPLICANT_FK_CHILDREN.items():
            for fk in inspector.get_foreign_keys(table):
                if fk.get("referred_table") == "ppdb_applicants" and col in fk.get(
                    "constrained_columns", []
                ):
                    name = fk["name"]
                    op.execute(
                        sa.text(f"ALTER TABLE {table} DROP FOREIGN KEY `{name}`")
                    )
                    dropped.append(
                        {
                            "name": name,
                            "table": table,
                            "col": col,
                            "ondelete": fk.get("ondelete"),
                            "onupdate": fk.get("onupdate"),
                        }
                    )

    # ── Widen the primary + referencing columns ────────────────────────────
    _alter_type("ppdb_applicants", "id", nullable=False)
    for table, col in _APPLICANT_FK_CHILDREN.items():
        _alter_type(table, col, nullable=False)
    _alter_type("ppdb_payment_transactions", "id", nullable=False)
    _alter_type("selection_results", "applicant_id", nullable=False)
    _alter_type("selection_scores", "applicant_id", nullable=False)

    # ── Re-create FKs on MySQL ─────────────────────────────────────────────
    if bind.dialect.name == "mysql":
        for fk in dropped:
            op.create_foreign_key(
                fk["name"],
                fk["table"],
                "ppdb_applicants",
                [fk["col"]],
                ["id"],
                ondelete=fk.get("ondelete"),
                onupdate=fk.get("onupdate"),
            )


def downgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "mysql":
        inspector = sa.inspect(bind)
        dropped: list[dict] = []
        for table, col in _APPLICANT_FK_CHILDREN.items():
            for fk in inspector.get_foreign_keys(table):
                if fk.get("referred_table") == "ppdb_applicants" and col in fk.get(
                    "constrained_columns", []
                ):
                    name = fk["name"]
                    op.execute(
                        sa.text(f"ALTER TABLE {table} DROP FOREIGN KEY `{name}`")
                    )
                    dropped.append(
                        {
                            "name": name,
                            "table": table,
                            "col": col,
                            "ondelete": fk.get("ondelete"),
                            "onupdate": fk.get("onupdate"),
                        }
                    )

    for table, col in _APPLICANT_FK_CHILDREN.items():
        if bind.dialect.name == "sqlite":
            with op.batch_alter_table(table) as batch:
                batch.alter_column(
                    col,
                    type_=sa.String(36),
                    existing_type=sa.String(64),
                    existing_nullable=False,
                )
        else:
            op.alter_column(
                table,
                col,
                type_=sa.String(36),
                existing_type=sa.String(64),
                existing_nullable=False,
            )

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("ppdb_applicants") as batch:
            batch.alter_column(
                "id",
                type_=sa.String(36),
                existing_type=sa.String(64),
                existing_nullable=False,
            )
        with op.batch_alter_table("ppdb_payment_transactions") as batch:
            batch.alter_column(
                "id",
                type_=sa.String(36),
                existing_type=sa.String(64),
                existing_nullable=False,
            )
        with op.batch_alter_table("selection_results") as batch:
            batch.alter_column(
                "applicant_id",
                type_=sa.String(36),
                existing_type=sa.String(64),
                existing_nullable=False,
            )
        with op.batch_alter_table("selection_scores") as batch:
            batch.alter_column(
                "applicant_id",
                type_=sa.String(36),
                existing_type=sa.String(64),
                existing_nullable=False,
            )
    else:
        op.alter_column(
            "ppdb_applicants",
            "id",
            type_=sa.String(36),
            existing_type=sa.String(64),
            existing_nullable=False,
        )
        op.alter_column(
            "ppdb_payment_transactions",
            "id",
            type_=sa.String(36),
            existing_type=sa.String(64),
            existing_nullable=False,
        )
        op.alter_column(
            "selection_results",
            "applicant_id",
            type_=sa.String(36),
            existing_type=sa.String(64),
            existing_nullable=False,
        )
        op.alter_column(
            "selection_scores",
            "applicant_id",
            type_=sa.String(36),
            existing_type=sa.String(64),
            existing_nullable=False,
        )

    if bind.dialect.name == "mysql":
        for fk in dropped:
            op.create_foreign_key(
                fk["name"],
                fk["table"],
                "ppdb_applicants",
                [fk["col"]],
                ["id"],
                ondelete=fk.get("ondelete"),
                onupdate=fk.get("onupdate"),
            )
