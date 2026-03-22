"""make description nullable

Revision ID: 169d3a0c8158
Revises: a1b2c3d4e5f6
Create Date: 2026-03-22 17:10:46.146312

"""
from alembic import op
import sqlalchemy as sa


revision = '169d3a0c8158'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('content', 'description',
               existing_type=sa.TEXT(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('content', 'description',
               existing_type=sa.TEXT(),
               nullable=False)
