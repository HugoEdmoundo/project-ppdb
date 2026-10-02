"""Add wave early registrant and component discount settings.

Revision ID: 0031
Revises: 0030
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0031"
down_revision: str | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def _add_missing_columns(table: str, columns: dict[str, sa.Column]) -> None:
    existing = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)
    }
    for name, column in columns.items():
        if name not in existing:
            with op.batch_alter_table(table) as batch_op:
                batch_op.add_column(column)


def upgrade() -> None:
    _add_missing_columns(
        "ppdb_waves",
        {
            "early_discount_quota": sa.Column(
                "early_discount_quota", sa.Integer(), nullable=False, server_default="0"
            ),
        },
    )
    _add_missing_columns(
        "ppdb_wave_fee_items",
        {
            "discount_type": sa.Column("discount_type", sa.String(10), nullable=True),
            "discount_value": sa.Column("discount_value", sa.Float(), nullable=True),
            "discount_scope": sa.Column(
                "discount_scope", sa.String(10), nullable=False, server_default="all"
            ),
        },
    )


def downgrade() -> None:
    for table, names in (
        ("ppdb_wave_fee_items", ("discount_scope", "discount_value", "discount_type")),
        ("ppdb_waves", ("early_discount_quota",)),
    ):
        existing = {
            column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)
        }
        for name in names:
            if name in existing:
                with op.batch_alter_table(table) as batch_op:
                    batch_op.drop_column(name)
