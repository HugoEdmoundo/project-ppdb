"""add wa_group_link to ppdb_periods

Revision ID: 336c9510d4cf
Revises: 4096cac74b43
Create Date: 2026-10-08 11:35:37.518257

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "336c9510d4cf"
down_revision: str | None = "4096cac74b43"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("ppdb_periods")]
    if "wa_group_link" not in cols:
        op.add_column(
            "ppdb_periods",
            sa.Column("wa_group_link", sa.String(length=500), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("ppdb_periods", "wa_group_link")
