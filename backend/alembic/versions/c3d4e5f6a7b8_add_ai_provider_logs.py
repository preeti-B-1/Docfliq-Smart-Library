"""add ai_provider_logs table

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "169d3a0c8158"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_provider_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("used_as_fallback", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_ai_provider_logs_content_id", "ai_provider_logs", ["content_id"])
    op.create_index("ix_ai_provider_logs_created_at", "ai_provider_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_provider_logs_created_at")
    op.drop_index("ix_ai_provider_logs_content_id")
    op.drop_table("ai_provider_logs")
