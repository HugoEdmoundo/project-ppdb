"""roles is_system

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-16

"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c["name"] for c in inspector.get_columns("roles")}

    if "is_system" not in existing_columns:
        with op.batch_alter_table("roles") as batch:
            batch.add_column(
                sa.Column("is_system", sa.Boolean, nullable=False, server_default="0")
            )
        
        # Backfill is_system=1 for 'Superadmin' and 'Calon Murid'
        op.execute(
            "UPDATE roles SET is_system = 1 WHERE name IN ('Superadmin', 'Calon Murid')"
        )

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {c["name"] for c in inspector.get_columns("roles")}

    if "is_system" in existing_columns:
        with op.batch_alter_table("roles") as batch:
            batch.drop_column("is_system")
