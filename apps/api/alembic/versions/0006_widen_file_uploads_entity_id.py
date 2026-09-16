# mypy: ignore-errors
"""widen file_uploads.entity_id

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-16

PPDB document uploads reference ppdb_applicants.id which is `applicant-{uuid}`
(46 chars), wider than the original varchar(36) entity_id column. Widen it so
INSERTs from /ppdb/documents/upload do not fail with "Data too long".
"""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("file_uploads")}

    if "entity_id" in columns:
        with op.batch_alter_table("file_uploads") as batch:
            batch.alter_column("entity_id", type_=sa.String(50))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {c["name"] for c in inspector.get_columns("file_uploads")}

    if "entity_id" in columns:
        with op.batch_alter_table("file_uploads") as batch:
            batch.alter_column("entity_id", type_=sa.String(36))
