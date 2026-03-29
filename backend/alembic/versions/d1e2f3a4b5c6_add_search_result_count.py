"""add search result count

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6a7b8
Create Date: 2026-03-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd1e2f3a4b5c6'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('search_logs', sa.Column('result_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('search_logs', 'result_count')
