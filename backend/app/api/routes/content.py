from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import get_current_user, get_optional_user, require_admin
from app.api.deps.database import get_db
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.user import User
from app.schemas.content import (
    ContentCardResponse,
    ContentListItemResponse,
    ContentResponse,
    ContentStatusResponse,
    ContentUpdateRequest,
    ContentUploadResponse,
    PaginatedContentResponse,
    TagResponse,
)
from app.services import ai_service, content_service
from app.utils.text_extractor import strip_to_plain_text

router = APIRouter(prefix="/api/content", tags=["content"])

_MAX_FILE_SIZE = 25 * 1024 * 1024
_ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def _build_content_response(content: Content) -> ContentResponse:
    tags = [TagResponse.model_validate(ct.tag) for ct in content.content_tags]
    return ContentResponse(
        id=content.id,
        title=content.title,
        description=content.description,
        body_text=content.body_text,
        status=content.status,
        processing_status=content.processing_status,
        ai_summary=content.ai_summary,
        view_count=content.view_count,
        tags=tags,
        created_at=content.created_at,
        updated_at=content.updated_at,
        published_at=content.published_at,
    )


def _build_card_response(content: Content) -> ContentCardResponse:
    tags = [TagResponse.model_validate(ct.tag) for ct in content.content_tags]
    return ContentCardResponse(
        id=content.id,
        title=content.title,
        description=content.description,
        ai_summary=content.ai_summary,
        view_count=content.view_count,
        status=content.status,
        processing_status=content.processing_status,
        tags=tags,
        created_at=content.created_at,
        published_at=content.published_at,
    )


@router.get("", response_model=PaginatedContentResponse)
async def list_content(
    search: str | None = Query(None),
    specialties: str | None = Query(None),
    difficulties: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    sort: str = Query("recent"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> PaginatedContentResponse:
    specialty_list = [s.strip() for s in specialties.split(",") if s.strip()] if specialties else None
    difficulty_list = [d.strip() for d in difficulties.split(",") if d.strip()] if difficulties else None

    contents, total, bookmarked_ids = await content_service.list_content(
        db=db,
        search=search,
        specialties=specialty_list,
        difficulties=difficulty_list,
        page=page,
        per_page=per_page,
        sort=sort,
        user_id=current_user.id if current_user else None,
    )

    items: list[ContentListItemResponse] = []
    for content in contents:
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
                is_bookmarked=content.id in bookmarked_ids,
            )
        )

    total_pages = max(1, (total + per_page - 1) // per_page)
    return PaginatedContentResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/drafts", response_model=list[ContentCardResponse])
async def list_drafts(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[ContentCardResponse]:
    drafts = await content_service.list_drafts(db)
    return [_build_card_response(d) for d in drafts]


@router.post("/upload", response_model=ContentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_content(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile | None = File(None),
    html_content: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContentUploadResponse:
    if file is None and not html_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either a file or text content.",
        )

    if file is not None:
        filename = file.filename or ""
        ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
        if ext not in _ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only .pdf and .docx files are accepted.",
            )

        data = await file.read()
        if len(data) > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File exceeds the 25MB limit.",
            )

        content = await content_service.create_content(
            title=title.strip(),
            description=description.strip() if description else None,
            body_text="",
            db=db,
        )
        background_tasks.add_task(ai_service.process_file_content, content.id, filename, data)
    else:
        html = (html_content or "").strip()
        if not html:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content cannot be empty.",
            )

        plain_text = strip_to_plain_text(html)
        content = await content_service.create_content(
            title=title.strip(),
            description=description.strip() if description else None,
            body_text=html,
            db=db,
        )
        background_tasks.add_task(ai_service.tag_content, content.id, plain_text)

    return ContentUploadResponse(id=content.id, processing_status=content.processing_status)


@router.get("/{content_id}/status", response_model=ContentStatusResponse)
async def get_content_status(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> ContentStatusResponse:
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()

    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    return ContentStatusResponse(id=content.id, processing_status=content.processing_status)


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ContentResponse:
    is_admin = current_user is not None and current_user.role == "admin"
    content = await content_service.get_content_by_id(
        db=db,
        content_id=content_id,
        user_id=current_user.id if current_user else None,
        is_admin=is_admin,
    )

    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    return _build_content_response(content)


@router.put("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: int,
    update_data: ContentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContentResponse:
    content = await content_service.update_content(db=db, content_id=content_id, update_data=update_data)

    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    return _build_content_response(content)


@router.put("/{content_id}/publish", response_model=ContentResponse)
async def publish_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContentResponse:
    content = await content_service.publish_content(db=db, content_id=content_id)

    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    result = await db.execute(
        select(Content)
        .where(Content.id == content_id)
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
    )
    content_with_tags = result.scalar_one_or_none()
    if content_with_tags is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    return _build_content_response(content_with_tags)


@router.put("/{content_id}/unpublish", response_model=ContentResponse)
async def unpublish_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> ContentResponse:
    content = await content_service.unpublish_content(db=db, content_id=content_id)

    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    result = await db.execute(
        select(Content)
        .where(Content.id == content_id)
        .options(selectinload(Content.content_tags).selectinload(ContentTag.tag))
    )
    content_with_tags = result.scalar_one_or_none()
    if content_with_tags is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    return _build_content_response(content_with_tags)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    deleted = await content_service.delete_content(db=db, content_id=content_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")
