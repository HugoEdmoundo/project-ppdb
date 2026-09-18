"""0021 — add wa fields to notification_logs

Revision ID: 0021
Revises: 0020
Create Date: 2026-09-18

Tambah kolom ke notification_logs untuk integrasi WA microservice:
  - wa_message_id  : ID pesan dari whatsapp-web.js (saat delivery berhasil)
  - retry_count    : Jumlah retry yang sudah dilakukan
  - created_at     : Timestamp pertama kali log dibuat

Idempotent: skip ADD COLUMN jika kolom sudah ada (handle kasus kolom
ditambah manual sebelum migration ini dijalankan).
"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op  # type: ignore[attr-defined]

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def _existing_columns(table: str) -> set[str]:
    """Return set of column names that already exist in the table."""
    bind = op.get_bind()
    insp = inspect(bind)
    return {col["name"] for col in insp.get_columns(table)}


def _index_exists(index_name: str, table: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return any(idx["name"] == index_name for idx in insp.get_indexes(table))


def upgrade() -> None:
    existing = _existing_columns("notification_logs")

    if "wa_message_id" not in existing:
        op.add_column(
            "notification_logs",
            sa.Column("wa_message_id", sa.String(255), nullable=True),
        )

    if "retry_count" not in existing:
        op.add_column(
            "notification_logs",
            sa.Column(
                "retry_count",
                sa.Integer(),
                nullable=False,
                server_default="0",
            ),
        )

    if "created_at" not in existing:
        op.add_column(
            "notification_logs",
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
                server_default=sa.func.now(),
            ),
        )
        op.execute(
            "UPDATE notification_logs SET created_at = sent_at WHERE created_at IS NULL"
        )

    if not _index_exists("ix_notification_logs_status", "notification_logs"):
        op.create_index(
            "ix_notification_logs_status",
            "notification_logs",
            ["status"],
        )

    if not _index_exists("ix_notification_logs_event_key", "notification_logs"):
        op.create_index(
            "ix_notification_logs_event_key",
            "notification_logs",
            ["event_key"],
        )


def downgrade() -> None:
    if _index_exists("ix_notification_logs_event_key", "notification_logs"):
        op.drop_index("ix_notification_logs_event_key", "notification_logs")
    if _index_exists("ix_notification_logs_status", "notification_logs"):
        op.drop_index("ix_notification_logs_status", "notification_logs")

    existing = _existing_columns("notification_logs")
    if "created_at" in existing:
        op.drop_column("notification_logs", "created_at")
    if "retry_count" in existing:
        op.drop_column("notification_logs", "retry_count")
    if "wa_message_id" in existing:
        op.drop_column("notification_logs", "wa_message_id")
