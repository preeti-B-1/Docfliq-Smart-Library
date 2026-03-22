from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="reader")
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bookmarks: Mapped[list["Bookmark"]] = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")
    reading_history: Mapped[list["ReadingHistory"]] = relationship("ReadingHistory", back_populates="user", cascade="all, delete-orphan")
    page_views: Mapped[list["PageView"]] = relationship("PageView", back_populates="user", cascade="all, delete-orphan")
    search_logs: Mapped[list["SearchLog"]] = relationship("SearchLog", back_populates="user", cascade="all, delete-orphan")
