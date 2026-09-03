"""add file_uploads.data for db-backed storage

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-18 17:30:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "file_uploads",
        sa.Column("data", sa.LargeBinary(length=16777215), nullable=True),
    )


def downgrade():
    op.drop_column("file_uploads", "data")
