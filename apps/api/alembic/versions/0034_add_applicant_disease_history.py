"""Add disease_history to ppdb_applicants.

Riwayat penyakit (pengganti dokumen Medical Checkup) sudah diisi pendaftar sejak
formulir pendaftaran awal, tetapi kolomnya belum pernah ada di basis data sehingga
ORM(select all mapped columns) bisa gagal. Migration ini menambahkan kolomnya.

Revision ID: 0034
Revises: 0033
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0034"
down_revision: str | None = "0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | None = None


def _has_disease_history() -> bool:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("ppdb_applicants")
    }
    return "disease_history" in columns


def upgrade() -> None:
    if _has_disease_history():
        return
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        batch_op.add_column(sa.Column("disease_history", sa.String(255), nullable=True))


def downgrade() -> None:
    if not _has_disease_history():
        return
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        batch_op.drop_column("disease_history")
