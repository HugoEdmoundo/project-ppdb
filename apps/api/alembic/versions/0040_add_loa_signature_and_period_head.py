"""Add head_of_committee to ppdb_periods and loa signature columns to ppdb_applicants

Revision ID: 0040
Revises: 0039
Create Date: 2026-10-14 11:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0040"
down_revision: str | None = "0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. ppdb_periods: head_of_committee
    period_cols = {c["name"] for c in inspector.get_columns("ppdb_periods")}
    if "head_of_committee" not in period_cols:
        with op.batch_alter_table("ppdb_periods") as batch_op:
            batch_op.add_column(
                sa.Column("head_of_committee", sa.String(length=150), nullable=True)
            )

    # 2. ppdb_applicants: registration_number, loa signature columns
    app_cols = {c["name"] for c in inspector.get_columns("ppdb_applicants")}
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        if "registration_number" not in app_cols:
            batch_op.add_column(
                sa.Column("registration_number", sa.String(length=50), nullable=True)
            )
        if "is_loa_signed" not in app_cols:
            batch_op.add_column(
                sa.Column(
                    "is_loa_signed",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("0"),
                )
            )
        if "loa_signed_at" not in app_cols:
            batch_op.add_column(
                sa.Column("loa_signed_at", sa.DateTime(), nullable=True)
            )
        if "loa_signer_name" not in app_cols:
            batch_op.add_column(
                sa.Column("loa_signer_name", sa.String(length=255), nullable=True)
            )
        if "loa_signer_relation" not in app_cols:
            batch_op.add_column(
                sa.Column("loa_signer_relation", sa.String(length=50), nullable=True)
            )
        if "loa_signature_data" not in app_cols:
            batch_op.add_column(
                sa.Column("loa_signature_data", sa.Text(), nullable=True)
            )
        if "loa_signature_token" not in app_cols:
            batch_op.add_column(
                sa.Column("loa_signature_token", sa.String(length=64), nullable=True)
            )

    # Populate registration_number for existing applicants where NULL
    existing_applicants = bind.execute(
        sa.text(
            "SELECT id, created_at FROM ppdb_applicants "
            "WHERE registration_number IS NULL"
        )
    ).fetchall()

    for idx, (app_id, created_at) in enumerate(existing_applicants, start=1):
        c_date = created_at.strftime("%d%m%y") if created_at else "141026"
        clean_id = "".join(c for c in app_id if c.isalnum())[-5:].upper().zfill(5)
        reg_no = f"REG-{c_date}{clean_id}"
        bind.execute(
            sa.text(
                "UPDATE ppdb_applicants SET registration_number = :reg_no "
                "WHERE id = :app_id"
            ),
            {"reg_no": reg_no, "app_id": app_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    app_cols = {c["name"] for c in inspector.get_columns("ppdb_applicants")}
    with op.batch_alter_table("ppdb_applicants") as batch_op:
        for col in [
            "loa_signature_token",
            "loa_signature_data",
            "loa_signer_relation",
            "loa_signer_name",
            "loa_signed_at",
            "is_loa_signed",
            "registration_number",
        ]:
            if col in app_cols:
                batch_op.drop_column(col)

    period_cols = {c["name"] for c in inspector.get_columns("ppdb_periods")}
    if "head_of_committee" in period_cols:
        with op.batch_alter_table("ppdb_periods") as batch_op:
            batch_op.drop_column("head_of_committee")
