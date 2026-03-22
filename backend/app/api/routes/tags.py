from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_admin
from app.api.deps.database import get_db
from app.models.user import User
from app.schemas.content import TagResponse
from app.schemas.tag import TagMergeRequest, TagRenameRequest, TagWithCountResponse
from app.services import tag_service

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=list[TagWithCountResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[TagWithCountResponse]:
    rows = await tag_service.get_all_tags(db)
    return [
        TagWithCountResponse(
            id=tag.id,
            name=tag.name,
            type=tag.type,
            is_fixed=tag.is_fixed,
            content_count=count,
        )
        for tag, count in rows
    ]


@router.get("/specialties", response_model=list[TagResponse])
async def list_specialties(
    db: AsyncSession = Depends(get_db),
) -> list[TagResponse]:
    tags = await tag_service.get_specialties(db)
    return [TagResponse.model_validate(t) for t in tags]


@router.put("/{tag_id}", response_model=TagResponse)
async def rename_tag(
    tag_id: int,
    body: TagRenameRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> TagResponse:
    tag = await tag_service.rename_tag(db, tag_id, body.name)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found.")
    return TagResponse.model_validate(tag)


@router.post("/merge", response_model=TagResponse)
async def merge_tags(
    body: TagMergeRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> TagResponse:
    tag = await tag_service.merge_tags(db, body.source_ids, body.target_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target tag not found.")
    return TagResponse.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    deleted = await tag_service.delete_tag(db, tag_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found.")
