"""Add percentage weights to evaluator criteria.

Revision ID: 0029
Revises: 0028
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0029"
down_revision: str | None = "0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {
        column["name"] for column in sa.inspect(bind).get_columns("selection_criteria")
    }
    added_weight = "weight" not in columns
    if added_weight:
        with op.batch_alter_table("selection_criteria") as batch_op:
            batch_op.add_column(
                sa.Column("weight", sa.Float(), nullable=False, server_default="0")
            )
    # Existing rubrics had no weights. Give their criteria equal shares so old
    # evaluator forms remain usable after the upgrade.
    if added_weight:
        groups = bind.execute(
            sa.text(
                "SELECT category_id, COUNT(*) FROM selection_criteria "
                "GROUP BY category_id HAVING COUNT(*) > 0"
            )
        ).all()
        for category_id, count in groups:
            bind.execute(
                sa.text(
                    "UPDATE selection_criteria SET weight = :weight "
                    "WHERE category_id = :category_id"
                ),
                {"weight": 100.0 / count, "category_id": category_id},
            )


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("selection_criteria")
    }
    if "weight" in columns:
        with op.batch_alter_table("selection_criteria") as batch_op:
            batch_op.drop_column("weight")
