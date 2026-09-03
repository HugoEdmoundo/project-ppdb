"""add selection_sessions and selection_results tables

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-25 14:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "selection_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("wave_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=True),
        sa.Column("start_time", sa.String(length=10), nullable=True),
        sa.Column("end_time", sa.String(length=10), nullable=True),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "selection_results",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "applicant_id",
            sa.String(length=36),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("session_id", sa.String(length=36), nullable=True, index=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("graduation_status", sa.String(length=20), nullable=True),
        sa.Column("graduation_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table("selection_results")
    op.drop_table("selection_sessions")
