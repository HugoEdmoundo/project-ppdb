# mypy: ignore-errors
"""Phase 2: MOU, Diskonasi, Pembayaran Tahap 2

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-27 16:21:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())

    # ALTER TABLE ppdb_waves ADD COLUMN mou_template LONGTEXT NULL
    wave_cols = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("ppdb_waves")}
    if "mou_template" not in wave_cols:
        op.add_column(
            "ppdb_waves",
            sa.Column("mou_template", sa.Text(length=4294967295), nullable=True),
        )

    # ppdb_wave_fee_items
    if "ppdb_wave_fee_items" not in existing:
        op.create_table(
            "ppdb_wave_fee_items",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("wave_id", sa.String(length=36), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("nominal", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("order_index", sa.Integer(), server_default="0", nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["wave_id"], ["ppdb_waves.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    # ppdb_applicant_discounts
    if "ppdb_applicant_discounts" not in existing:
        op.create_table(
            "ppdb_applicant_discounts",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("applicant_id", sa.String(length=36), nullable=False),
            sa.Column("fee_item_id", sa.String(length=36), nullable=False),
            sa.Column("discount_type", sa.String(length=10), nullable=True),
            sa.Column(
                "discount_value", sa.Numeric(precision=15, scale=2), nullable=True
            ),
            sa.Column(
                "discount_amount", sa.BigInteger(), server_default="0", nullable=False
            ),
            sa.Column(
                "final_amount", sa.BigInteger(), server_default="0", nullable=False
            ),
            sa.Column(
                "installment_count", sa.Integer(), server_default="0", nullable=False
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["applicant_id"], ["ppdb_applicants.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["fee_item_id"], ["ppdb_wave_fee_items.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("applicant_id", "fee_item_id"),
        )

    # ppdb_stage2_bills
    if "ppdb_stage2_bills" not in existing:
        op.create_table(
            "ppdb_stage2_bills",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("applicant_id", sa.String(length=36), nullable=False),
            sa.Column("fee_item_id", sa.String(length=36), nullable=False),
            sa.Column("discount_id", sa.String(length=36), nullable=True),
            sa.Column(
                "installment_number", sa.Integer(), server_default="0", nullable=False
            ),
            sa.Column("amount", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column(
                "status", sa.String(length=20), server_default="pending", nullable=False
            ),
            sa.Column("proof_url", sa.Text(), nullable=True),
            sa.Column("confirmed_by", sa.String(length=36), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["applicant_id"], ["ppdb_applicants.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["discount_id"], ["ppdb_applicant_discounts.id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(["fee_item_id"], ["ppdb_wave_fee_items.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # ppdb_mou
    if "ppdb_mou" not in existing:
        op.create_table(
            "ppdb_mou",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("applicant_id", sa.String(length=36), nullable=False),
            sa.Column("draft_content", sa.Text(length=4294967295), nullable=True),
            sa.Column("signature_data", sa.Text(length=4294967295), nullable=True),
            sa.Column(
                "status", sa.String(length=20), server_default="draft", nullable=False
            ),
            sa.Column("signed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["applicant_id"], ["ppdb_applicants.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("applicant_id"),
        )


def downgrade() -> None:
    op.drop_table("ppdb_mou")
    op.drop_table("ppdb_stage2_bills")
    op.drop_table("ppdb_applicant_discounts")
    op.drop_table("ppdb_wave_fee_items")
    op.drop_column("ppdb_waves", "mou_template")
