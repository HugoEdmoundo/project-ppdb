"""dynamic selection tables and session quota

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-25 16:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add quota to selection_sessions
    with op.batch_alter_table('selection_sessions') as batch_op:
        batch_op.add_column(sa.Column('quota', sa.Integer(), nullable=False, server_default='0'))

    # 2. Create selection_categories
    op.create_table(
        'selection_categories',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('wave_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # 3. Create selection_criteria
    op.create_table(
        'selection_criteria',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('category_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('max_score', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # 4. Create selection_scores (applicant grades per criteria)
    op.create_table(
        'selection_scores',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('applicant_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('criteria_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('applicant_id', 'criteria_id', name='uq_applicant_criteria_score')
    )


def downgrade():
    op.drop_table('selection_scores')
    op.drop_table('selection_criteria')
    op.drop_table('selection_categories')
    with op.batch_alter_table('selection_sessions') as batch_op:
        batch_op.drop_column('quota')
