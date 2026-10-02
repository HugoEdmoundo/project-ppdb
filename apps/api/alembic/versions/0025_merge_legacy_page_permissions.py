"""Merge legacy page aliases into canonical keys.

Revision ID: 0025
Revises: 0024
Create Date: 2026-10-02
"""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None

_RENAMES = {
    "ppdb": {
        "admin-dashboard": "dashboard",
        "ppdb-periods": "periods",
        "ppdb-applicants": "applicants",
        "ppdb-payments": "payments",
        "ppdb-selection": "selection",
    },
    "companyprofile": {
        "companyprofile-news": "news",
        "companyprofile-programs": "programs",
        "companyprofile-settings": "settings",
    },
}


def upgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" not in tables or "modules" not in tables:
        return

    metadata = sa.MetaData()
    pages = sa.Table("pages", metadata, autoload_with=bind)
    modules = sa.Table("modules", metadata, autoload_with=bind)
    permissions = (
        sa.Table("user_page_permissions", metadata, autoload_with=bind)
        if "user_page_permissions" in tables
        else None
    )
    now = datetime.now()

    for module_key, aliases in _RENAMES.items():
        module_id = bind.execute(
            sa.select(modules.c.id).where(modules.c.key == module_key)
        ).scalar_one_or_none()
        if module_id is None:
            continue

        for old_key, canonical_key in aliases.items():
            old_id = bind.execute(
                sa.select(pages.c.id).where(
                    pages.c.module_id == module_id, pages.c.key == old_key
                )
            ).scalar_one_or_none()
            if old_id is None:
                continue

            canonical_id = bind.execute(
                sa.select(pages.c.id).where(
                    pages.c.module_id == module_id,
                    pages.c.key == canonical_key,
                )
            ).scalar_one_or_none()
            if canonical_id is None:
                bind.execute(
                    pages.update()
                    .where(pages.c.id == old_id)
                    .values(key=canonical_key, updated_at=now)
                )
                continue

            if permissions is not None:
                old_grants = bind.execute(
                    sa.select(permissions.c.user_id, permissions.c.created_at).where(
                        permissions.c.page_id == old_id
                    )
                ).all()
                for grant in old_grants:
                    already_granted = bind.execute(
                        sa.select(permissions.c.id).where(
                            permissions.c.user_id == grant.user_id,
                            permissions.c.page_id == canonical_id,
                        )
                    ).first()
                    if not already_granted:
                        bind.execute(
                            permissions.insert().values(
                                id=str(uuid4()),
                                user_id=grant.user_id,
                                page_id=canonical_id,
                                created_at=grant.created_at or now,
                            )
                        )
                bind.execute(
                    permissions.delete().where(permissions.c.page_id == old_id)
                )

            bind.execute(pages.delete().where(pages.c.id == old_id))


def downgrade():
    # Permissions merged into canonical keys cannot be safely split back out.
    pass
