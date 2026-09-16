# mypy: ignore-errors
"""ppdb periods/waves v2 (academic year, description, wave schedule & quota)

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-13

Migrates the PPDB config tables to the "Periode -> Gelombang" model used by the
ppdb frontend:
  - ppdb_periods: add academic_year + description; make start/end_date optional
  - ppdb_waves:   add registration_start_date/registration_end_date/
                  document_upload_end_date/selection_date/quota; make start/end
                  date optional

All changes are ADD-ONLY / nullable, so no existing data is lost.
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- ppdb_periods ---
    period_cols = {c["name"] for c in inspector.get_columns("ppdb_periods")}
    with op.batch_alter_table("ppdb_periods") as batch:
        if "academic_year" not in period_cols:
            batch.add_column(sa.Column("academic_year", sa.String(20), nullable=True))
        if "description" not in period_cols:
            batch.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch.alter_column("start_date", existing_type=sa.Date(), nullable=True)
        batch.alter_column("end_date", existing_type=sa.Date(), nullable=True)

    # --- ppdb_waves ---
    wave_cols = {c["name"] for c in inspector.get_columns("ppdb_waves")}
    with op.batch_alter_table("ppdb_waves") as batch:
        for name, col in [
            ("registration_start_date", sa.Date()),
            ("registration_end_date", sa.Date()),
            ("document_upload_end_date", sa.Date()),
            ("selection_date", sa.Date()),
            ("quota", sa.Integer()),
        ]:
            if name not in wave_cols:
                batch.add_column(sa.Column(name, col, nullable=True))
        batch.alter_column("start_date", existing_type=sa.Date(), nullable=True)
        batch.alter_column("end_date", existing_type=sa.Date(), nullable=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("ppdb_waves") as batch:
        for name in (
            "selection_date",
            "document_upload_end_date",
            "registration_end_date",
            "registration_start_date",
            "quota",
        ):
            if name in {c["name"] for c in inspector.get_columns("ppdb_waves")}:
                batch.drop_column(name)

    with op.batch_alter_table("ppdb_periods") as batch:
        for name in ("description", "academic_year"):
            if name in {c["name"] for c in inspector.get_columns("ppdb_periods")}:
                batch.drop_column(name)
