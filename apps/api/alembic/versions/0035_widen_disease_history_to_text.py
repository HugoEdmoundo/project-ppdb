"""Widen disease_history to Text for full health identification questionnaire.

Revision ID: 0035
Revises: 0034
Create Date: 2026-10-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0035"
down_revision: str | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        batch_op.alter_column(
            "disease_history",
            existing_type=sa.String(255),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        batch_op.alter_column(
            "disease_history",
            existing_type=sa.Text(),
            type_=sa.String(255),
            existing_nullable=True,
        )
