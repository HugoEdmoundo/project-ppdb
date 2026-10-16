"""Add device/session metadata columns to refresh_tokens

Menambahkan kolom `user_agent`, `ip_address`, `app`, dan `last_seen_at` pada
tabel `refresh_tokens` supaya halaman Profile (semua app) bisa menampilkan
daftar "Sesi Perangkat": aplikasi apa, perangkat mana, IP, terakhir aktif,
dan sisa waktu token sebelum kedaluwarsa.

Revision ID: 0042
Revises: 0041
Create Date: 2026-10-16 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0042"
down_revision: str | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    cols = {c["name"] for c in inspector.get_columns("refresh_tokens")}

    if "user_agent" not in cols:
        op.add_column(
            "refresh_tokens",
            sa.Column("user_agent", sa.String(length=512), nullable=True),
        )
    if "ip_address" not in cols:
        op.add_column(
            "refresh_tokens",
            sa.Column("ip_address", sa.String(length=64), nullable=True),
        )
    if "app" not in cols:
        op.add_column(
            "refresh_tokens",
            sa.Column("app", sa.String(length=50), nullable=True),
        )
    if "last_seen_at" not in cols:
        op.add_column(
            "refresh_tokens",
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    cols = {c["name"] for c in inspector.get_columns("refresh_tokens")}
    for name in ("last_seen_at", "app", "ip_address", "user_agent"):
        if name in cols:
            op.drop_column("refresh_tokens", name)
