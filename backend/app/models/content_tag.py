from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ContentTag(Base):
    __tablename__ = "content_tags"
    __table_args__ = (UniqueConstraint("content_id", "tag_id", name="uq_content_tag"),)

    content_id: Mapped[int] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    content: Mapped["Content"] = relationship("Content", back_populates="content_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="content_tags")
