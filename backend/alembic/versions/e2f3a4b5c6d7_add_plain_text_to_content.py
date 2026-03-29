"""add plain_text to content

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-03-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('content', sa.Column('plain_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('content', 'plain_text')
