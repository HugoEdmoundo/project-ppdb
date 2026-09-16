# mypy: ignore-errors
"""add ppdb_applicants.rejection_reason

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-16

Admin rejection of an applicant's documents only lives inside notification_logs.
Persist the reason on ppdb_applicants so the applicant dashboard can display it
and the admin list can show it without digging through logs.
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("ppdb_applicants")}

    if "rejection_reason" not in columns:
        op.add_column(
            "ppdb_applicants", sa.Column("rejection_reason", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("ppdb_applicants")}

    if "rejection_reason" in columns:
        op.drop_column("ppdb_applicants", "rejection_reason")
