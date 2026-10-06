"""Add interview_session_id to selection_results.

Revision ID: 0033
Revises: 0032
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0033"
down_revision: str | None = "0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("selection_results")
    }
    if "interview_session_id" not in columns:
        with op.batch_alter_table("selection_results") as batch_op:
            batch_op.add_column(
                sa.Column("interview_session_id", sa.String(36), nullable=True)
            )


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("selection_results")
    }
    if "interview_session_id" in columns:
        with op.batch_alter_table("selection_results") as batch_op:
            batch_op.drop_column("interview_session_id")
