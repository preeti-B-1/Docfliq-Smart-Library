from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_optional_user, require_admin
from app.api.deps.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    AIProviderStats,
    PublishingAnalytics,
    SearchesAnalytics,
    SearchLogRequest,
    TagsAnalytics,
    UsersAnalytics,
    ViewsAnalytics,
)
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/ai-providers", response_model=AIProviderStats)
async def get_ai_provider_stats(
    date_range: str = "30d",
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> AIProviderStats:
    return await analytics_service.get_ai_provider_stats(date_range, db)


@router.get("/views", response_model=ViewsAnalytics)
async def get_views(
    date_range: str = "30d",
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> ViewsAnalytics:
    return await analytics_service.get_views_analytics(date_range, db)


@router.get("/tags", response_model=TagsAnalytics)
async def get_tags(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> TagsAnalytics:
    return await analytics_service.get_tags_analytics(db)


@router.get("/searches", response_model=SearchesAnalytics)
async def get_searches(
    date_range: str = "30d",
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> SearchesAnalytics:
    return await analytics_service.get_searches_analytics(date_range, db)


@router.get("/users", response_model=UsersAnalytics)
async def get_users(
    date_range: str = "30d",
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> UsersAnalytics:
    return await analytics_service.get_users_analytics(date_range, db)


@router.post("/log-search", status_code=204)
async def log_search(
    body: SearchLogRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> None:
    await analytics_service.log_search(
        body.query, current_user.id if current_user else None, body.result_count, db
    )


@router.get("/publishing", response_model=PublishingAnalytics)
async def get_publishing(
    date_range: str = "30d",
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
) -> PublishingAnalytics:
    return await analytics_service.get_publishing_analytics(date_range, db)
