from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user
from app.api.deps.database import get_db
from app.models.bookmark import Bookmark
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.user import User
from app.schemas.content import ContentListItemResponse

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.post("/{content_id}")
async def toggle_bookmark(
    content_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    content = await db.get(Content, content_id)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    result = await db.execute(
        select(Bookmark).where(
            Bookmark.user_id == current_user.id,
            Bookmark.content_id == content_id,
        )
    )
    bookmark = result.scalar_one_or_none()

    if bookmark:
        await db.delete(bookmark)
        await db.commit()
        return {"bookmarked": False}

    db.add(Bookmark(user_id=current_user.id, content_id=content_id))
    await db.commit()
    return {"bookmarked": True}


@router.get("", response_model=list[ContentListItemResponse])
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ContentListItemResponse]:
    result = await db.execute(
        select(Content, Bookmark.created_at)
        .join(Bookmark, Bookmark.content_id == Content.id)
        .where(Bookmark.user_id == current_user.id, Content.status == "published")
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
        .order_by(Bookmark.created_at.desc())
    )
    rows = result.all()

    items: list[ContentListItemResponse] = []
    for content, _ in rows:
        tags = [ct.tag for ct in content.content_tags]
        specialty_tags = [t.name for t in tags if t.type == "specialty"]
        topic_tags = [t.name for t in tags if t.type == "topic"]
        difficulty_tags = [t.name for t in tags if t.type == "difficulty"]
        items.append(
            ContentListItemResponse(
                id=content.id,
                title=content.title,
                description=content.description,
                ai_summary=content.ai_summary,
                specialty_tags=specialty_tags,
                topic_tags=topic_tags,
                difficulty_tag=difficulty_tags[0] if difficulty_tags else None,
                view_count=content.view_count,
                published_at=content.published_at,
                is_bookmarked=True,
            )
        )

    return items
