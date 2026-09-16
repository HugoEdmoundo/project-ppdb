# mypy: ignore-errors
"""baseline schema (as deployed)

Revision ID: 0001
Revises:
Create Date: 2026-08-13

Creates any of the baseline domain tables that do not exist yet (idempotent
against the live production database). Schema is derived from SQLAlchemy models
so it always matches the code.

Only the tables that existed BEFORE the alembic migration era are created here.
Tables introduced by later migrations (0003: ppdb_payment_transactions,
notification_templates, notification_logs; 0012/0013: selection_*;
0015: ppdb_wave_fee_items, ppdb_applicant_discounts, ppdb_stage2_bills,
ppdb_mou) are deliberately excluded so a fresh database flows through the
normal migration chain instead of being pre-created here.
"""

import sqlalchemy as sa

from alembic import op
from src.models import Base

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# Domain tables that existed at baseline (pre-0003). Everything younger is
# created by its own migration in the chain.
BASELINE_TABLES = frozenset(
    {
        # auth
        "users",
        "roles",
        "refresh_tokens",
        "user_page_permissions",
        "audit_log",
        "modules",
        "pages",
        # content
        "news_articles",
        "programs",
        "facilities",
        "staff",
        "achievements",
        "gallery_items",
        "testimonials",
        "social_links",
        "site_settings",
        "contact_info",
        # ppdb
        "ppdb_periods",
        "ppdb_waves",
        "ppdb_applicants",
        "file_uploads",
        "rate_limits",
    }
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    created = []
    for name in BASELINE_TABLES:
        if name in existing:
            continue
        table = Base.metadata.tables.get(name)
        if table is None:
            continue
        table.create(bind)
        created.append(name)

    print(f"baseline: created {created or ['nothing (all tables already present)']}")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    for name in reversed(list(BASELINE_TABLES)):
        if name in existing:
            op.drop_table(name)
