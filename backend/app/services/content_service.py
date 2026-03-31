from datetime import datetime, timezone

from sqlalchemy import and_, cast, delete as sa_delete, func, literal, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.postgresql import REGCONFIG
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bookmark import Bookmark
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.page_view import PageView
from app.models.reading_history import ReadingHistory
from app.models.tag import Tag
from app.schemas.content import ContentUpdateRequest
from app.services.ai_service import generate_embedding


def _weighted_average(vectors: list, weights: list[float]) -> list[float]:
    total = sum(weights)
    dim = len(vectors[0])
    result = [0.0] * dim
    for vec, w in zip(vectors, weights):
        for i, v in enumerate(vec):
            result[i] += v * w / total
    return result


async def list_content(
    db: AsyncSession,
    search: str | None = None,
    specialties: list[str] | None = None,
    difficulties: list[str] | None = None,
    page: int = 1,
    per_page: int = 12,
    sort: str = "recent",
    user_id: int | None = None,
) -> tuple[list[Content], int, set[int]]:
    base_filter = Content.status == "published"

    if specialties:
        specialty_subquery = (
            select(ContentTag.content_id)
            .join(Tag, Tag.id == ContentTag.tag_id)
            .where(and_(Tag.type == "specialty", Tag.name.in_(specialties)))
        )
        base_filter = and_(base_filter, Content.id.in_(specialty_subquery))

    if difficulties:
        difficulty_subquery = (
            select(ContentTag.content_id)
            .join(Tag, Tag.id == ContentTag.tag_id)
            .where(and_(Tag.type == "difficulty", Tag.name.in_(difficulties)))
        )
        base_filter = and_(base_filter, Content.id.in_(difficulty_subquery))

    if search:
        query_embedding = await generate_embedding(search)
        ts_query = func.plainto_tsquery(cast(literal("english"), REGCONFIG), search)

        keyword_match = Content.search_vector.op("@@")(ts_query)
        semantic_match = Content.embedding.cosine_distance(query_embedding) < 0.65
        search_filter = or_(keyword_match, semantic_match)

        keyword_score = func.coalesce(
            func.ts_rank(Content.search_vector, ts_query),
            literal(0.0),
        )
        semantic_score = func.coalesce(
            literal(1.0) - Content.embedding.cosine_distance(query_embedding) / literal(2.0),
            literal(0.0),
        )
        hybrid_score = (literal(0.5) * keyword_score) + (literal(0.5) * semantic_score)

        combined_filter = and_(base_filter, search_filter)
        count_query = select(func.count()).where(combined_filter)
        total = (await db.scalar(count_query)) or 0

        items_query = (
            select(Content)
            .where(combined_filter)
            .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
            .order_by(hybrid_score.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    else:
        history_rows: list = []
        if user_id and sort != "popular":
            history_result = await db.execute(
                select(Content.embedding, ReadingHistory.last_read_at)
                .join(ReadingHistory, Content.id == ReadingHistory.content_id)
                .where(ReadingHistory.user_id == user_id)
                .where(Content.embedding.is_not(None))
                .order_by(ReadingHistory.last_read_at.desc())
                .limit(50)
            )
            history_rows = history_result.fetchall()

        if len(history_rows) >= 3:
            embeddings = [row.embedding for row in history_rows]
            weights = [1.0 / (i + 1) for i in range(len(embeddings))]
            user_vector = _weighted_average(embeddings, weights)

            count_result = await db.scalar(
                select(func.count()).select_from(
                    select(Content).where(base_filter).subquery()
                )
            )
            total = count_result or 0

            items_query = (
                select(Content)
                .where(base_filter)
                .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
                .order_by(Content.embedding.cosine_distance(user_vector))
                .offset((page - 1) * per_page)
                .limit(per_page)
            )
        else:
            query = (
                select(Content)
                .where(base_filter)
                .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
            )
            count_result = await db.scalar(select(func.count()).select_from(query.subquery()))
            total = count_result or 0

            order_col = Content.view_count.desc() if sort == "popular" else Content.published_at.desc()
            items_query = query.order_by(order_col).offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(items_query)
    contents = list(result.scalars().all())

    bookmarked_ids: set[int] = set()
    if user_id and contents:
        content_ids = [c.id for c in contents]
        bm_result = await db.execute(
            select(Bookmark.content_id).where(
                and_(Bookmark.user_id == user_id, Bookmark.content_id.in_(content_ids))
            )
        )
        bookmarked_ids = set(bm_result.scalars().all())

    return contents, total, bookmarked_ids


async def list_drafts(db: AsyncSession) -> list[Content]:
    result = await db.execute(
        select(Content)
        .where(Content.status == "draft")
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
        .order_by(Content.created_at.desc())
    )
    return list(result.scalars().all())


async def create_content(
    title: str,
    description: str | None,
    body_text: str,
    db: AsyncSession,
) -> Content:
    content = Content(
        title=title,
        description=description,
        body_text=body_text,
        status="draft",
        processing_status="pending",
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return content


async def get_content_by_id(
    db: AsyncSession,
    content_id: int,
    user_id: int | None = None,
    is_admin: bool = False,
) -> Content | None:
    detail_query = (
        select(Content)
        .where(Content.id == content_id)
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
    )

    result = await db.execute(detail_query)
    content = result.scalar_one_or_none()

    if content is None:
        return None

    if content.status == "draft" and not is_admin:
        return None

    if content.status == "published":
        content.view_count += 1
        db.add(PageView(user_id=user_id, content_id=content_id))
        if user_id is not None:
            now = datetime.now(timezone.utc)
            await db.execute(
                pg_insert(ReadingHistory)
                .values(user_id=user_id, content_id=content_id, last_read_at=now)
                .on_conflict_do_update(
                    constraint="uq_user_reading",
                    set_={"last_read_at": now},
                )
            )
        await db.commit()
        result = await db.execute(detail_query)
        content = result.scalar_one_or_none()

    return content


async def update_content(
    db: AsyncSession,
    content_id: int,
    update_data: ContentUpdateRequest,
) -> Content | None:
    detail_query = (
        select(Content)
        .where(Content.id == content_id)
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
    )

    result = await db.execute(detail_query)
    content = result.scalar_one_or_none()
    if content is None:
        return None

    search_index_dirty = False

    if update_data.title is not None:
        search_index_dirty = search_index_dirty or update_data.title != content.title
        content.title = update_data.title
    if update_data.description is not None:
        content.description = update_data.description
    if update_data.body_text is not None:
        content.body_text = update_data.body_text
    if update_data.ai_summary is not None:
        search_index_dirty = search_index_dirty or update_data.ai_summary != content.ai_summary
        content.ai_summary = update_data.ai_summary

    if update_data.tags is not None:
        search_index_dirty = True
        await db.execute(sa_delete(ContentTag).where(ContentTag.content_id == content_id))

        for tag_input in update_data.tags:
            if tag_input.id is not None:
                tag = await db.get(Tag, tag_input.id)
                if tag:
                    db.add(ContentTag(content_id=content_id, tag_id=tag.id))
            else:
                tag_result = await db.execute(
                    select(Tag).where(
                        func.lower(Tag.name) == tag_input.name.lower(),
                        Tag.type == tag_input.type,
                    )
                )
                tag = tag_result.scalar_one_or_none()
                if tag is None:
                    tag = Tag(
                        name=tag_input.name,
                        type=tag_input.type,
                        is_fixed=tag_input.type in ("specialty", "difficulty"),
                    )
                    db.add(tag)
                    await db.flush()
                db.add(ContentTag(content_id=content_id, tag_id=tag.id))

    if search_index_dirty:
        if update_data.tags is not None:
            key_terms_str = " ".join(t.name for t in update_data.tags if t.type == "key_term")
        else:
            kt_result = await db.execute(
                select(Tag.name)
                .join(ContentTag, ContentTag.tag_id == Tag.id)
                .where(ContentTag.content_id == content_id, Tag.type == "key_term")
            )
            key_terms_str = " ".join(kt_result.scalars().all())
        content.search_vector = func.to_tsvector(
            "english",
            content.title + " " + (content.ai_summary or "") + (" " + key_terms_str if key_terms_str else ""),
        )

    await db.commit()
    result = await db.execute(detail_query)
    return result.scalar_one_or_none()


async def publish_content(db: AsyncSession, content_id: int) -> Content | None:
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        return None
    content.status = "published"
    content.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(content)
    return content


async def unpublish_content(db: AsyncSession, content_id: int) -> Content | None:
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        return None
    content.status = "draft"
    content.published_at = None
    await db.commit()
    await db.refresh(content)
    return content


async def get_related_content(
    db: AsyncSession,
    content_id: int,
    limit: int = 4,
) -> list[Content]:
    current_tag_ids = select(ContentTag.tag_id).where(ContentTag.content_id == content_id)

    overlap_subq = (
        select(ContentTag.content_id, func.count().label("overlap"))
        .where(
            ContentTag.tag_id.in_(current_tag_ids),
            ContentTag.content_id != content_id,
        )
        .group_by(ContentTag.content_id)
        .subquery()
    )

    result = await db.execute(
        select(Content)
        .join(overlap_subq, Content.id == overlap_subq.c.content_id)
        .where(Content.status == "published")
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
        .order_by(overlap_subq.c.overlap.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def delete_content(db: AsyncSession, content_id: int) -> bool:
    from app.utils.storage import delete_images
    from bs4 import BeautifulSoup

    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if content is None:
        return False

    image_urls = [
        img["src"]
        for img in BeautifulSoup(content.body_text or "", "html.parser").find_all("img")
        if img.get("src", "").startswith("http")
    ]

    await db.execute(sa_delete(Bookmark).where(Bookmark.content_id == content_id))
    await db.execute(sa_delete(PageView).where(PageView.content_id == content_id))
    await db.execute(sa_delete(ReadingHistory).where(ReadingHistory.content_id == content_id))
    await db.delete(content)
    await db.commit()

    if image_urls:
        await delete_images(image_urls)

    return True
