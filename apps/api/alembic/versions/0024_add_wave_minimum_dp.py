"""Add minimum DP configuration to each PPDB wave.

Revision ID: 0024
Revises: 0023
Create Date: 2026-10-02
"""

import sqlalchemy as sa

from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade():
    columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("ppdb_waves")
    }
    if "minimum_dp" not in columns:
        op.add_column(
            "ppdb_waves",
            sa.Column(
                "minimum_dp", sa.BigInteger(), nullable=False, server_default="0"
            ),
        )


def downgrade():
    columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("ppdb_waves")
    }
    if "minimum_dp" in columns:
        op.drop_column("ppdb_waves", "minimum_dp")
