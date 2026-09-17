# mypy: ignore-errors
"""Unify page permission keys with frontend navigation contracts

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-17 12:00:00.000000

Legacy page keys (``admin-dashboard``, ``ppdb-applicants``,
``companyprofile-news``, ...) never matched the keys the PPDB admin nav
derives from its routes (``/admin/<key>``) nor the tab keys used by the
Company Profile admin (``tab.key``). Page-level permissions assigned to a
user therefore hid almost every menu item instead of restricting it.

This migration renames page keys in place (so existing
``user_page_permissions`` rows keep pointing to the same pages), refreshes
label/icon/sort_order, and inserts the pages that were missing so every
navigable admin page can be restricted per-user.

The canonical key set below MUST mirror ``scripts/seed.py`` → ``PAGES``.
"""

from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Legacy page key → unified key (keep page id so permissions stay intact).
_RENAMES: dict[str, dict[str, str]] = {
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

# Canonical pages (module key → [(key, label, icon, sort_order)]).
_PAGES: dict[str, list[tuple[str, str, str, int]]] = {
    "ppdb": [
        ("dashboard", "Dashboard Admin", "LayoutDashboard", 5),
        ("data-pendaftar", "Data Pendaftar", "Users", 10),
        ("applicants", "Dokumen Pendaftar", "FolderOpen", 20),
        ("selection", "Seleksi", "ClipboardCheck", 30),
        ("mou", "Review MOU", "FileSignature", 35),
        ("payments", "Pembayaran Formulir", "Wallet", 40),
        ("diskonasi", "Diskonasi", "Percent", 45),
        ("stage2-pembayaran", "Pembayaran Tahap 2", "CreditCard", 50),
        ("periods", "Periode PPDB", "CalendarDays", 55),
        ("notifications", "Notifikasi", "Bell", 60),
    ],
    "companyprofile": [
        ("news", "Berita", "Newspaper", 10),
        ("programs", "Program", "BookOpen", 20),
        ("facilities", "Fasilitas", "Building2", 30),
        ("staff", "Staff", "Users", 40),
        ("achievements", "Prestasi", "Trophy", 50),
        ("gallery", "Galeri", "ImageIcon", 60),
        ("testimonials", "Testimoni", "MessageSquare", 70),
        ("social", "Tautan Sosial", "LinkIcon", 80),
        ("contact", "Info Kontak", "Phone", 90),
        ("settings", "Pengaturan", "Settings", 100),
    ],
}


def _module_ids(bind) -> dict[str, str]:
    modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
    cols = (modules.c["id"], modules.c["key"])
    rows = bind.execute(sa.select(*cols).where(modules.c["key"].in_(list(_RENAMES))))
    return {row.key: row.id for row in rows}


def _upsert_pages(bind, pages: sa.Table, now) -> None:
    for mod_key, mid in _module_ids(bind).items():
        # Rename legacy keys in place first.
        for old, new in _RENAMES.get(mod_key, {}).items():
            new_row = bind.execute(
                sa.select(pages.c["id"]).where(
                    pages.c["module_id"] == mid, pages.c["key"] == new
                )
            ).first()
            if new_row:
                continue
            old_row = bind.execute(
                sa.select(pages.c["id"]).where(
                    pages.c["module_id"] == mid, pages.c["key"] == old
                )
            ).first()
            if old_row:
                bind.execute(
                    pages.update()
                    .where(pages.c["id"] == old_row.id)
                    .values(key=new, updated_at=now)
                )

        # Ensure every canonical page exists with the right metadata.
        for key, label, icon, sort_order in _PAGES.get(mod_key, []):
            row = bind.execute(
                sa.select(pages.c["id"]).where(
                    pages.c["module_id"] == mid, pages.c["key"] == key
                )
            ).first()
            if row:
                bind.execute(
                    pages.update()
                    .where(pages.c["id"] == row.id)
                    .values(
                        label=label, icon=icon, sort_order=sort_order, updated_at=now
                    )
                )
            else:
                bind.execute(
                    pages.insert().values(
                        id=str(uuid4()),
                        module_id=mid,
                        key=key,
                        label=label,
                        icon=icon,
                        sort_order=sort_order,
                        created_at=now,
                        updated_at=now,
                    )
                )


def upgrade() -> None:
    bind = op.get_bind()
    if "pages" not in {t for t in sa.inspect(bind).get_table_names()}:
        return
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    now = datetime.now()
    _upsert_pages(bind, pages, now)


def downgrade() -> None:
    bind = op.get_bind()
    if "pages" not in {t for t in sa.inspect(bind).get_table_names()}:
        return
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    now = datetime.now()

    legacy_values = {v for vals in _RENAMES.values() for v in vals.values()}
    for mod_key, mid in _module_ids(bind).items():
        # Remove pages that did not exist in the legacy layout.
        for key, *_ in _PAGES.get(mod_key, []):
            if key in legacy_values:
                continue
            row = bind.execute(
                sa.select(pages.c["id"]).where(
                    pages.c["module_id"] == mid, pages.c["key"] == key
                )
            ).first()
            if row:
                bind.execute(pages.delete().where(pages.c["id"] == row.id))

        # Revert renames.
        for old, new in _RENAMES.get(mod_key, {}).items():
            row = bind.execute(
                sa.select(pages.c["id"]).where(
                    pages.c["module_id"] == mid, pages.c["key"] == new
                )
            ).first()
            if row:
                bind.execute(
                    pages.update()
                    .where(pages.c["id"] == row.id)
                    .values(key=old, updated_at=now)
                )
