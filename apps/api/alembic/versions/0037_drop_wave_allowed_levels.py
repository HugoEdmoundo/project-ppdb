"""drop allowed_levels from ppdb_waves (legacy no-jenjang cleanup)

Revision ID: 0037
Revises: 336c9510d4cf
Create Date: 2026-10-08 18:15:00.000000

Rationale:
  `allowed_levels` was added in migration 0011 as part of a wave-scope
  feature that was never fully implemented.  Per AGENTS.md the system
  does NOT support education-level selection anywhere — no enrollment
  form, no backoffice config, and no API field exposes it.  The column
  held a static default of "SMK" and was never read by any service,
  repository, or schema.  Dropping it removes the last artefact of the
  old jenjang-selection flow.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0037"
down_revision: str | None = "336c9510d4cf"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("ppdb_waves")}
    if "allowed_levels" in cols:
        op.drop_column("ppdb_waves", "allowed_levels")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("ppdb_waves")}
    if "allowed_levels" not in cols:
        op.add_column(
            "ppdb_waves",
            sa.Column(
                "allowed_levels",
                sa.String(length=100),
                nullable=False,
                server_default="SMK",
            ),
        )
