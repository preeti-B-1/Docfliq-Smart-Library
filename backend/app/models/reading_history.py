from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReadingHistory(Base):
    __tablename__ = "reading_history"
    __table_args__ = (UniqueConstraint("user_id", "content_id", name="uq_user_reading"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content_id: Mapped[int] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), nullable=False)
    last_read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="reading_history")
    content: Mapped["Content"] = relationship("Content", back_populates="reading_history")
