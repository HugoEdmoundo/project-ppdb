"""Add description to selection_criteria

Revision ID: e4242ed4f5d5
Revises: 0036
Create Date: 2026-10-08 10:59:15.775686

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4242ed4f5d5"
down_revision: str | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "selection_criteria",
        sa.Column("description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("selection_criteria", "description")
