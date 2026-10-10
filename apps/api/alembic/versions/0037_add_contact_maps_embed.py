"""Add maps_embed to contact_info.

Revision ID: 0037
Revises: 0036
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0037"
down_revision: str | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def _existing_columns() -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in sa.inspect(bind).get_columns("contact_info")}


def upgrade() -> None:
    if "maps_embed" not in _existing_columns():
        with op.batch_alter_table("contact_info") as batch_op:
            batch_op.add_column(sa.Column("maps_embed", sa.Text, nullable=True))


def downgrade() -> None:
    if "maps_embed" in _existing_columns():
        with op.batch_alter_table("contact_info") as batch_op:
            batch_op.drop_column("maps_embed")
