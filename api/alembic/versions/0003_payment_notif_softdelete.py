"""payment tracking, soft-delete, notification templates & logs

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-14

Changes:
  1. ppdb_applicants
       + payment_status  VARCHAR(20) DEFAULT 'pending'
       + payment_deadline DATETIME(3) NULL
       + deleted_at       DATETIME(3) NULL   ← soft delete flag (NULL = aktif)

  2. CREATE TABLE ppdb_payment_transactions
       Rekam setiap transaksi pembayaran formulir PPDB
       (pending → success / failed / expired / cancelled)

  3. CREATE TABLE notification_templates
       Template pesan customizable per event_key (admin bisa override)

  4. CREATE TABLE notification_logs
       Log setiap percobaan kirim notif (status: pending | sent | failed)

All column additions are nullable / have defaults → zero downtime, safe for
running against a live production database.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import DATETIME

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # ── 1. Tambah kolom ke ppdb_applicants ───────────────────────────────────
    applicant_cols = {c["name"] for c in inspector.get_columns("ppdb_applicants")}
    with op.batch_alter_table("ppdb_applicants") as batch:
        if "payment_status" not in applicant_cols:
            batch.add_column(
                sa.Column("payment_status", sa.String(20), nullable=False,
                          server_default="pending")
            )
        if "payment_deadline" not in applicant_cols:
            batch.add_column(
                sa.Column("payment_deadline", DATETIME(fsp=3), nullable=True)
            )
        if "deleted_at" not in applicant_cols:
            batch.add_column(
                sa.Column("deleted_at", DATETIME(fsp=3), nullable=True, default=None)
            )

    # ── 2. CREATE ppdb_payment_transactions ──────────────────────────────────
    if "ppdb_payment_transactions" not in existing_tables:
        op.create_table(
            "ppdb_payment_transactions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "applicant_id",
                sa.String(36),
                sa.ForeignKey("ppdb_applicants.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("method", sa.String(20), nullable=False, server_default="offline"),
            sa.Column("amount", sa.BigInteger, nullable=False, server_default="0"),
            # pending | success | failed | expired | cancelled
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("external_id", sa.String(100), nullable=True),
            sa.Column("gateway_payload", sa.Text, nullable=True),
            sa.Column("failure_reason", sa.Text, nullable=True),
            sa.Column("proof_url", sa.Text, nullable=True),
            sa.Column("confirmed_by", sa.String(36), nullable=True),
            sa.Column("confirmed_at", DATETIME(fsp=3), nullable=True),
            sa.Column("notes", sa.Text, nullable=True),
            sa.Column("created_at", DATETIME(fsp=3), nullable=False),
            sa.Column("updated_at", DATETIME(fsp=3), nullable=False),
        )

    # ── 3. CREATE notification_templates ─────────────────────────────────────
    if "notification_templates" not in existing_tables:
        op.create_table(
            "notification_templates",
            sa.Column("id", sa.String(36), primary_key=True),
            # Identifier unik per event: welcome | payment_success | payment_failed |
            #   payment_reminder_d7 | payment_expired |
            #   document_reminder_d3 | document_reminder_d1 |
            #   document_approved | document_rejected |
            #   selection_reminder_d5 | selection_reminder_d1 | selection_result
            sa.Column("event_key", sa.String(50), nullable=False, unique=True),
            sa.Column("label", sa.String(100), nullable=False),
            # email | whatsapp | both
            sa.Column("channel", sa.String(20), nullable=False, server_default="both"),
            sa.Column("email_subject", sa.String(255), nullable=True),
            sa.Column("body", sa.Text, nullable=False),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
            sa.Column("created_at", DATETIME(fsp=3), nullable=False),
            sa.Column("updated_at", DATETIME(fsp=3), nullable=False),
        )

    # ── 4. CREATE notification_logs ──────────────────────────────────────────
    if "notification_logs" not in existing_tables:
        op.create_table(
            "notification_logs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "template_id",
                sa.String(36),
                sa.ForeignKey("notification_templates.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("event_key", sa.String(50), nullable=False),
            sa.Column(
                "recipient_user_id",
                sa.String(36),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("recipient_name", sa.String(255), nullable=True),
            sa.Column("recipient_email", sa.String(100), nullable=True),
            sa.Column("recipient_phone", sa.String(20), nullable=True),
            # email | whatsapp
            sa.Column("channel", sa.String(20), nullable=False),
            sa.Column("subject_sent", sa.String(255), nullable=True),
            sa.Column("body_sent", sa.Text, nullable=True),
            # pending | sent | failed
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("error_message", sa.Text, nullable=True),
            sa.Column("sent_at", DATETIME(fsp=3), nullable=True),
            sa.Column("created_at", DATETIME(fsp=3), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # DROP tabel baru (urutan terbalik karena FK)
    for tbl in ("notification_logs", "notification_templates", "ppdb_payment_transactions"):
        if tbl in existing_tables:
            op.drop_table(tbl)

    # Hapus kolom yang ditambahkan ke ppdb_applicants
    applicant_cols = {c["name"] for c in inspector.get_columns("ppdb_applicants")}
    with op.batch_alter_table("ppdb_applicants") as batch:
        for col in ("deleted_at", "payment_deadline", "payment_status"):
            if col in applicant_cols:
                batch.drop_column(col)
