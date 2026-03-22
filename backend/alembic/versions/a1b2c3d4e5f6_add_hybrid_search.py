"""add hybrid search columns

Revision ID: a1b2c3d4e5f6
Revises: 7b3826a3dc5a
Create Date: 2026-03-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "7b3826a3dc5a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.add_column("content", sa.Column("embedding", sa.Text(), nullable=True))
    op.execute("ALTER TABLE content ALTER COLUMN embedding TYPE vector(1536) USING NULL")

    op.add_column(
        "content",
        sa.Column("search_vector", sa.Text(), nullable=True),
    )
    op.execute(
        "ALTER TABLE content ALTER COLUMN search_vector TYPE tsvector USING NULL"
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_content_search_vector "
        "ON content USING gin(search_vector)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_content_embedding "
        "ON content USING ivfflat(embedding vector_cosine_ops) WITH (lists = 10)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_content_embedding")
    op.execute("DROP INDEX IF EXISTS ix_content_search_vector")
    op.drop_column("content", "search_vector")
    op.drop_column("content", "embedding")
