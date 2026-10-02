"""Add the PPDB template and document settings page permission.

Revision ID: 0026
Revises: 0025
Create Date: 2026-10-02
"""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision = "0026"
down_revision = "0025"
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

    existing = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module.id,
            pages.c.key == "document-settings",
        )
    ).first()
    values = {
        "key": "document-settings",
        "label": "Template & Dokumen",
        "icon": "FileText",
        "sort_order": 65,
        "updated_at": datetime.now(),
    }
    if existing:
        bind.execute(pages.update().where(pages.c.id == existing.id).values(**values))
    else:
        bind.execute(
            pages.insert().values(
                id=str(uuid4()),
                module_id=module.id,
                **values,
                created_at=values["updated_at"],
            )
        )


def downgrade():
    bind = op.get_bind()
    if "pages" not in sa.inspect(bind).get_table_names():
        return
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    bind.execute(pages.delete().where(pages.c.key == "document-settings"))
