from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AIProviderLog(Base):
    __tablename__ = "ai_provider_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="tagging")
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    used_as_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
