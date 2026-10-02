"""Add type, delivery mode, and officer details to selection sessions.

Revision ID: 0030
Revises: 0029
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0030"
down_revision: str | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("selection_sessions")
    }
    additions = {
        "session_type": sa.Column("session_type", sa.String(20), nullable=True),
        "mode": sa.Column("mode", sa.String(10), nullable=True),
        "officer_name": sa.Column("officer_name", sa.String(150), nullable=True),
        "meeting_url": sa.Column("meeting_url", sa.String(500), nullable=True),
    }
    for name, column in additions.items():
        if name not in columns:
            with op.batch_alter_table("selection_sessions") as batch_op:
                batch_op.add_column(column)


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("selection_sessions")
    }
    for name in ("meeting_url", "officer_name", "mode", "session_type"):
        if name in columns:
            with op.batch_alter_table("selection_sessions") as batch_op:
                batch_op.drop_column(name)
