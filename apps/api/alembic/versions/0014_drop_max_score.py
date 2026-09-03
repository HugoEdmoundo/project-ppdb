"""drop max_score from selection_criteria

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-27 15:00:00.000000

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("selection_criteria") as batch_op:
        batch_op.drop_column("max_score")


def downgrade():
    with op.batch_alter_table("selection_criteria") as batch_op:
        batch_op.add_column(
            sa.Column("max_score", sa.Float(), nullable=False, server_default="100.0")
        )
