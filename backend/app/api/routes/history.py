from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.api.deps.database import get_db
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.reading_history import ReadingHistory
from app.models.user import User
from app.schemas.content import ReadingHistoryItemResponse

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[ReadingHistoryItemResponse])
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReadingHistoryItemResponse]:
    result = await db.execute(
        select(Content, ReadingHistory.last_read_at)
        .join(ReadingHistory, ReadingHistory.content_id == Content.id)
        .where(ReadingHistory.user_id == current_user.id)
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
        .order_by(ReadingHistory.last_read_at.desc())
    )
    rows = result.all()

    items: list[ReadingHistoryItemResponse] = []
    for content, last_read_at in rows:
        tags = [ct.tag for ct in content.content_tags]
        specialty_tags = [t.name for t in tags if t.type == "specialty"]
        topic_tags = [t.name for t in tags if t.type == "topic"]
        difficulty_tags = [t.name for t in tags if t.type == "difficulty"]
        items.append(
            ReadingHistoryItemResponse(
                id=content.id,
                title=content.title,
                description=content.description,
                ai_summary=content.ai_summary,
                specialty_tags=specialty_tags,
                topic_tags=topic_tags,
                difficulty_tag=difficulty_tags[0] if difficulty_tags else None,
                view_count=content.view_count,
                published_at=content.published_at,
                is_bookmarked=False,
                last_read_at=last_read_at,
            )
        )

    return items
