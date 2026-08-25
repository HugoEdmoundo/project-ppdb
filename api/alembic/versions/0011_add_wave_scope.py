"""add wave scope: allowed_paths and allowed_levels

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ppdb_waves', sa.Column('allowed_paths', sa.String(length=50), nullable=False, server_default='reguler,pindahan'))
    op.add_column('ppdb_waves', sa.Column('allowed_levels', sa.String(length=100), nullable=False, server_default='SMP,SMK'))


def downgrade():
    op.drop_column('ppdb_waves', 'allowed_levels')
    op.drop_column('ppdb_waves', 'allowed_paths')
