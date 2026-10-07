"""Add detailed parent/guardian fields to ppdb_applicants.

Revision ID: 0036
Revises: 0035
Create Date: 2026-10-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0036"
down_revision: str | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None

PARENT_COLUMNS = [
    ("father_name", sa.String(150)),
    ("father_job", sa.String(100)),
    ("father_phone", sa.String(20)),
    ("mother_name", sa.String(150)),
    ("mother_job", sa.String(100)),
    ("mother_phone", sa.String(20)),
    ("guardian_name", sa.String(150)),
    ("guardian_job", sa.String(100)),
    ("parent_phone", sa.String(20)),
    ("parent_income", sa.String(100)),
    ("parent_email", sa.String(100)),
]


def _existing_columns() -> set[str]:
    bind = op.get_bind()
    return {
        column["name"] for column in sa.inspect(bind).get_columns("ppdb_applicants")
    }


def upgrade() -> None:
    existing = _existing_columns()
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        for col_name, col_type in PARENT_COLUMNS:
            if col_name not in existing:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    existing = _existing_columns()
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        for col_name, _ in PARENT_COLUMNS:
            if col_name in existing:
                batch_op.drop_column(col_name)
