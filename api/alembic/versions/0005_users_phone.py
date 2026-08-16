"""users.phone for notification delivery

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-16

Menambahkan kolom `phone` ke tabel `users` supaya akun non-pendaftar
(pengguna panel / admin) punya nomor WhatsApp untuk pengiriman notifikasi.

Nullable + default NULL -> zero downtime di produksi.
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c["name"] for c in inspector.get_columns("users")}

    if "phone" not in existing_columns:
        with op.batch_alter_table("users") as batch:
            batch.add_column(sa.Column("phone", sa.String(32), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c["name"] for c in inspector.get_columns("users")}

    if "phone" in existing_columns:
        with op.batch_alter_table("users") as batch:
            batch.drop_column("phone")
