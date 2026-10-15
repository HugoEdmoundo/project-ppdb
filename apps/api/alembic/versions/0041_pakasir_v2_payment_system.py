"""Add Pakasir v2 payment columns, receipt snapshots, dp_status, and stage2 templates

Revision ID: 0041
Revises: 0040
Create Date: 2026-10-14 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

revision: str = "0041"
down_revision: str | None = "0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. ppdb_payment_transactions additions
    tx_cols = {c["name"] for c in inspector.get_columns("ppdb_payment_transactions")}

    new_tx_columns = [
        sa.Column("order_id", sa.String(100), nullable=True, index=True),
        sa.Column("txn_id", sa.String(100), nullable=True, index=True),
        sa.Column("payment_type", sa.String(30), nullable=False, server_default="form"),
        sa.Column("installment_number", sa.Integer(), nullable=True),
        sa.Column("provider_status", sa.String(50), nullable=True),
        sa.Column("qr_string", sa.Text(), nullable=True),
        sa.Column("expired_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("total_obligation", sa.BigInteger(), nullable=True),
        sa.Column("total_paid_before", sa.BigInteger(), nullable=True),
        sa.Column("remaining_before", sa.BigInteger(), nullable=True),
        sa.Column("total_paid_after", sa.BigInteger(), nullable=True),
        sa.Column("remaining_after", sa.BigInteger(), nullable=True),
        sa.Column("receipt_number", sa.String(50), nullable=True),
    ]

    for col in new_tx_columns:
        if col.name not in tx_cols:
            op.add_column("ppdb_payment_transactions", col)

    # 2. ppdb_applicants: dp_status & dp_paid_at
    app_cols = {c["name"] for c in inspector.get_columns("ppdb_applicants")}
    if "dp_status" not in app_cols:
        op.add_column(
            "ppdb_applicants",
            sa.Column(
                "dp_status", sa.String(20), nullable=False, server_default="pending"
            ),
        )
    if "dp_paid_at" not in app_cols:
        op.add_column(
            "ppdb_applicants",
            sa.Column("dp_paid_at", sa.DateTime(), nullable=True),
        )

    # 3. Seed notification template for stage2 installment success
    is_sqlite = bind.dialect.name == "sqlite"
    stage2_tpl_body = (
        "✅ *PEMBAYARAN CICILAN TAHAP 2 BERHASIL!*\n\n"
        "Halo *{nama_peserta}*,\n"
        "Pembayaran {jenis_pembayaran} ({nomor_cicilan}) sejumlah *{nominal_bayar}* "
        "telah berhasil diverifikasi pada {tanggal_bayar}.\n\n"
        "📊 *Rincian Saldo Kewajiban:*\n"
        "• Total Tagihan LoA: {total_tagihan_loa}\n"
        "• Total Terbayar Sebelumnya: {total_bayar_sebelum}\n"
        "• Sisa Tagihan Sebelumnya: {sisa_tagihan_sebelum}\n"
        "• Total Terbayar Sekarang: {total_bayar_sesudah}\n"
        "• Sisa Tagihan Sekarang: *{sisa_tagihan_sesudah}*\n"
        "• Status: *{status_lunas}*\n\n"
        "📄 Kuitansi resmi dapat dilihat dan diunduh di tautan berikut:\n"
        "{link_kuitansi}\n\n"
        "Terima kasih atas komitmen Anda."
    )

    if is_sqlite:
        bind.execute(
            text(
                "INSERT OR IGNORE INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, "
                "is_active, created_at, updated_at) "
                "VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, "
                "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": "notiftmpl-1020-stage2-installment-success",
                "ek": "stage2_installment_success",
                "lb": "Pembayaran Cicilan Tahap 2 Berhasil",
                "ch": "whatsapp",
                "es": None,
                "bd": stage2_tpl_body,
            },
        )
    else:
        bind.execute(
            text(
                "INSERT IGNORE INTO notification_templates "
                "(id, event_key, label, channel, email_subject, body, "
                "is_active, created_at, updated_at) "
                "VALUES (:id, :ek, :lb, :ch, :es, :bd, 1, NOW(), NOW())"
            ),
            {
                "id": "notiftmpl-1020-stage2-installment-success",
                "ek": "stage2_installment_success",
                "lb": "Pembayaran Cicilan Tahap 2 Berhasil",
                "ch": "whatsapp",
                "es": None,
                "bd": stage2_tpl_body,
            },
        )


def downgrade() -> None:
    pass
