"""drop legacy mou and dates

Revision ID: 4096cac74b43
Revises: e4242ed4f5d5
Create Date: 2026-10-08 11:25:47.951445

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "4096cac74b43"
down_revision: str | None = "e4242ed4f5d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.drop_column("ppdb_waves", "mou_template")
    op.drop_column("ppdb_waves", "document_upload_end_date")
    op.drop_column("ppdb_waves", "selection_date")
    op.drop_table("ppdb_mou")


def downgrade() -> None:
    op.create_table(
        "ppdb_mou",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("applicant_id", sa.String(length=64), nullable=True),
        sa.Column("draft_content", sa.Text(), nullable=True),
        sa.Column("signature_data", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["applicant_id"], ["ppdb_applicants.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("applicant_id"),
    )
    op.add_column("ppdb_waves", sa.Column("selection_date", sa.Date(), nullable=True))
    op.add_column(
        "ppdb_waves", sa.Column("document_upload_end_date", sa.Date(), nullable=True)
    )
    op.add_column("ppdb_waves", sa.Column("mou_template", sa.Text(), nullable=True))
