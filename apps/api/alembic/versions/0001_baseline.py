"""baseline schema (as deployed)

Revision ID: 0001
Revises:
Create Date: 2026-08-13

Creates any of the 26 domain tables that do not exist yet (idempotent against
the live production database). Schema is derived from SQLAlchemy models so it
always matches the code.
"""

import sqlalchemy as sa

from alembic import op
from src.models import Base

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    created = []
    for name, table in Base.metadata.tables.items():
        if name not in existing:
            table.create(bind)
            created.append(name)

    # Guard against a partially-seeded DB that already has users/roles but no
    # support tables: nothing is forced here, we only add what is missing.
    print(f"baseline: created {created or ['nothing (all tables already present)']}")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    for name in reversed(list(Base.metadata.tables.keys())):
        if name in existing:
            op.drop_table(name)
