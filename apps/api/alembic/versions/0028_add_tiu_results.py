"""Persist automatic TIU scores idempotently.

Revision ID: 0028
Revises: 0027
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0028"
down_revision: str | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "tiu_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("applicant_id", sa.String(length=64), nullable=False),
        sa.Column("attempt_id", sa.String(length=64), nullable=True),
        sa.Column("idempotency_key", sa.String(length=200), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["applicant_id"], ["ppdb_applicants.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("applicant_id", name="uq_tiu_results_applicant_id"),
        sa.UniqueConstraint("attempt_id", name="uq_tiu_results_attempt_id"),
        sa.UniqueConstraint("idempotency_key", name="uq_tiu_results_idempotency_key"),
    )


def downgrade() -> None:
    op.drop_table("tiu_results")
