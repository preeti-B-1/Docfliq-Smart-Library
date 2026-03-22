from fastapi import HTTPException, status
from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content_tag import ContentTag
from app.models.tag import Tag


async def get_all_tags(db: AsyncSession) -> list[tuple[Tag, int]]:
    result = await db.execute(
        select(Tag, func.count(ContentTag.content_id).label("content_count"))
        .outerjoin(ContentTag, ContentTag.tag_id == Tag.id)
        .group_by(Tag.id)
        .order_by(Tag.type, Tag.name)
    )
    return list(result.all())


async def get_specialties(db: AsyncSession) -> list[Tag]:
    result = await db.execute(
        select(Tag).where(Tag.type == "specialty").order_by(Tag.name)
    )
    return list(result.scalars().all())


async def rename_tag(db: AsyncSession, tag_id: int, new_name: str) -> Tag | None:
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        return None
    if tag.is_fixed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot rename a fixed tag.")
    tag.name = new_name
    await db.commit()
    await db.refresh(tag)
    return tag


async def merge_tags(db: AsyncSession, source_ids: list[int], target_id: int) -> Tag | None:
    target_result = await db.execute(select(Tag).where(Tag.id == target_id))
    target = target_result.scalar_one_or_none()
    if target is None:
        return None
    if target.is_fixed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot merge into a fixed tag.")

    for source_id in source_ids:
        if source_id == target_id:
            continue

        source_result = await db.execute(select(Tag).where(Tag.id == source_id))
        source_tag = source_result.scalar_one_or_none()
        if source_tag is None:
            continue
        if source_tag.is_fixed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot merge a fixed tag.")

        existing_target_content_ids_result = await db.execute(
            select(ContentTag.content_id).where(ContentTag.tag_id == target_id)
        )
        existing_target_content_ids = set(existing_target_content_ids_result.scalars().all())

        source_cts_result = await db.execute(
            select(ContentTag).where(ContentTag.tag_id == source_id)
        )
        for ct in source_cts_result.scalars().all():
            if ct.content_id not in existing_target_content_ids:
                db.add(ContentTag(content_id=ct.content_id, tag_id=target_id))
                existing_target_content_ids.add(ct.content_id)

        await db.execute(sa_delete(ContentTag).where(ContentTag.tag_id == source_id))
        await db.delete(source_tag)

    await db.commit()
    await db.refresh(target)
    return target


async def delete_tag(db: AsyncSession, tag_id: int) -> bool:
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        return False
    if tag.is_fixed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete a fixed tag.")
    await db.execute(sa_delete(ContentTag).where(ContentTag.tag_id == tag_id))
    await db.delete(tag)
    await db.commit()
    return True
