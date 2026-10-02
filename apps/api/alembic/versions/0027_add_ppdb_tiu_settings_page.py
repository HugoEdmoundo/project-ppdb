"""Add the PPDB global TIU settings page permission.

Revision ID: 0027
Revises: 0026
Create Date: 2026-10-02
"""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" not in tables or "modules" not in tables:
        return

    modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    module = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "ppdb")
    ).first()
    if not module:
        return

    now = datetime.now()
    values = {
        "label": "Pengaturan TIU",
        "icon": "Timer",
        "sort_order": 70,
        "updated_at": now,
    }
    existing = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module.id,
            pages.c.key == "tiu-settings",
        )
    ).first()
    if existing:
        bind.execute(pages.update().where(pages.c.id == existing.id).values(**values))
    else:
        bind.execute(
            pages.insert().values(
                id=str(uuid4()),
                module_id=module.id,
                key="tiu-settings",
                created_at=now,
                **values,
            )
        )


def downgrade():
    bind = op.get_bind()
    if "pages" not in sa.inspect(bind).get_table_names():
        return
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    bind.execute(pages.delete().where(pages.c.key == "tiu-settings"))
