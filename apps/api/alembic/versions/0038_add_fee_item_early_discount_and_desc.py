"""Add description and early registrant discount fields to ppdb_wave_fee_items

Revision ID: 0038
Revises: 0037
Create Date: 2026-10-09 09:35:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0038"
down_revision: str | None = "0037"
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
        "ppdb_wave_fee_items",
        {
            "description": sa.Column("description", sa.String(500), nullable=True),
            "early_discount_type": sa.Column(
                "early_discount_type", sa.String(10), nullable=True
            ),
            "early_discount_value": sa.Column(
                "early_discount_value", sa.Float(), nullable=True
            ),
        },
    )


def downgrade() -> None:
    table = "ppdb_wave_fee_items"
    existing = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)
    }
    for col_name in ("description", "early_discount_type", "early_discount_value"):
        if col_name in existing:
            with op.batch_alter_table(table) as batch_op:
                batch_op.drop_column(col_name)
