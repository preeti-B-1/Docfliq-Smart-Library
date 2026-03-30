from datetime import datetime, timedelta, timezone

from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Date

from app.models.ai_provider_log import AIProviderLog
from app.models.content import Content
from app.models.content_tag import ContentTag
from app.models.page_view import PageView
from app.models.search_log import SearchLog
from app.models.tag import Tag
from app.models.user import User
from app.schemas.analytics import (
    AIFallbackEvent,
    AIProviderStats,
    DailySignup,
    PublishingAnalytics,
    SearchesAnalytics,
    SearchTermFrequency,
    TagPopularity,
    TagsAnalytics,
    TopArticleView,
    UsersAnalytics,
    ViewsAnalytics,
    WeeklyPublish,
    ZeroResultSearch,
)


def _date_cutoff(date_range: str) -> datetime | None:
    if date_range == "7d":
        return datetime.now(timezone.utc) - timedelta(days=7)
    if date_range == "30d":
        return datetime.now(timezone.utc) - timedelta(days=30)
    return None


async def get_ai_provider_stats(date_range: str, db: AsyncSession) -> AIProviderStats:
    cutoff = _date_cutoff(date_range)

    query = select(AIProviderLog)
    if cutoff:
        query = query.where(AIProviderLog.created_at >= cutoff)

    result = await db.execute(query)
    logs = result.scalars().all()

    tagging_logs = [l for l in logs if l.source == "tagging"]
    claude_logs = [l for l in tagging_logs if l.provider == "claude"]
    gpt_logs = [l for l in tagging_logs if l.provider == "gpt-4o-mini" and l.used_as_fallback]

    total_calls = len(claude_logs)
    fallback_calls = len(gpt_logs)
    claude_successes = sum(1 for l in claude_logs if l.success)
    gpt_successes = sum(1 for l in gpt_logs if l.success)

    fallback_rate = fallback_calls / total_calls if total_calls else 0.0
    claude_success_rate = claude_successes / total_calls if total_calls else 0.0
    gpt_success_rate = gpt_successes / fallback_calls if fallback_calls else 0.0

    tagging_fallback_query = (
        select(AIProviderLog)
        .where(AIProviderLog.source == "tagging", AIProviderLog.provider == "claude", AIProviderLog.success.is_(False))
    )
    if cutoff:
        tagging_fallback_query = tagging_fallback_query.where(AIProviderLog.created_at >= cutoff)
    tagging_fallback_query = tagging_fallback_query.order_by(AIProviderLog.created_at.desc()).limit(20)

    fallback_result = await db.execute(tagging_fallback_query)
    recent_fallbacks = [
        AIFallbackEvent(
            content_id=row.content_id,
            error_message=row.error_message,
            duration_ms=row.duration_ms,
            created_at=row.created_at,
        )
        for row in fallback_result.scalars().all()
    ]

    ask_ai_logs = [l for l in logs if l.source == "ask_ai"]
    ask_ai_claude_failures = sum(1 for l in ask_ai_logs if l.provider == "claude" and not l.success)
    ask_ai_gpt_fallbacks = sum(1 for l in ask_ai_logs if l.used_as_fallback and l.success)

    ask_ai_fallback_query = (
        select(AIProviderLog)
        .where(AIProviderLog.source == "ask_ai", AIProviderLog.provider == "claude", AIProviderLog.success.is_(False))
    )
    if cutoff:
        ask_ai_fallback_query = ask_ai_fallback_query.where(AIProviderLog.created_at >= cutoff)
    ask_ai_fallback_query = ask_ai_fallback_query.order_by(AIProviderLog.created_at.desc()).limit(20)

    ask_ai_fallback_result = await db.execute(ask_ai_fallback_query)
    recent_ask_ai_fallbacks = [
        AIFallbackEvent(
            content_id=row.content_id,
            error_message=row.error_message,
            duration_ms=row.duration_ms,
            created_at=row.created_at,
        )
        for row in ask_ai_fallback_result.scalars().all()
    ]

    return AIProviderStats(
        total_calls=total_calls,
        claude_calls=claude_successes,
        fallback_calls=fallback_calls,
        fallback_rate=round(fallback_rate, 4),
        claude_success_rate=round(claude_success_rate, 4),
        gpt_success_rate=round(gpt_success_rate, 4),
        recent_fallbacks=recent_fallbacks,
        ask_ai_claude_failures=ask_ai_claude_failures,
        ask_ai_gpt_fallbacks=ask_ai_gpt_fallbacks,
        recent_ask_ai_fallbacks=recent_ask_ai_fallbacks,
    )


async def get_views_analytics(date_range: str, db: AsyncSession) -> ViewsAnalytics:
    cutoff = _date_cutoff(date_range)

    stmt = (
        select(Content.id, Content.title, func.count(PageView.id).label("view_count"))
        .join(PageView, PageView.content_id == Content.id)
        .where(Content.status == "published")
    )
    if cutoff:
        stmt = stmt.where(PageView.viewed_at >= cutoff)
    stmt = (
        stmt.group_by(Content.id, Content.title)
        .order_by(func.count(PageView.id).desc())
        .limit(10)
    )

    result = await db.execute(stmt)
    rows = result.all()
    return ViewsAnalytics(
        top_articles=[
            TopArticleView(id=r.id, title=r.title, view_count=r.view_count)
            for r in rows
        ]
    )


async def get_tags_analytics(db: AsyncSession) -> TagsAnalytics:
    stmt = (
        select(Tag.name, func.count(ContentTag.content_id).label("article_count"))
        .join(ContentTag, ContentTag.tag_id == Tag.id)
        .join(Content, Content.id == ContentTag.content_id)
        .where(Tag.type == "specialty")
        .where(Content.status == "published")
        .group_by(Tag.name)
        .order_by(func.count(ContentTag.content_id).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()
    return TagsAnalytics(
        specialties=[TagPopularity(name=r.name, article_count=r.article_count) for r in rows]
    )


async def get_searches_analytics(date_range: str, db: AsyncSession) -> SearchesAnalytics:
    cutoff = _date_cutoff(date_range)

    top_stmt = (
        select(SearchLog.query, func.count(SearchLog.id).label("count"))
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(5)
    )
    if cutoff:
        top_stmt = top_stmt.where(SearchLog.searched_at >= cutoff)

    top_result = await db.execute(top_stmt)
    top_rows = top_result.all()

    zero_stmt = (
        select(SearchLog.query, func.count(SearchLog.id).label("count"))
        .where(SearchLog.result_count == 0)
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(5)
    )
    if cutoff:
        zero_stmt = zero_stmt.where(SearchLog.searched_at >= cutoff)

    zero_result = await db.execute(zero_stmt)
    zero_rows = zero_result.all()

    return SearchesAnalytics(
        top_searches=[SearchTermFrequency(query=r.query, count=r.count) for r in top_rows],
        zero_result_searches=[ZeroResultSearch(query=r.query, count=r.count) for r in zero_rows],
    )


async def get_publishing_analytics(date_range: str, db: AsyncSession) -> PublishingAnalytics:
    cutoff = _date_cutoff(date_range)

    trunc_expr = func.date_trunc("week", Content.published_at)
    stmt = (
        select(
            trunc_expr.label("week"),
            func.count(Content.id).label("count"),
        )
        .where(Content.status == "published")
        .where(Content.published_at.isnot(None))
        .group_by(trunc_expr)
        .order_by(trunc_expr)
    )
    if cutoff:
        stmt = stmt.where(Content.published_at >= cutoff)

    result = await db.execute(stmt)
    rows = result.all()

    return PublishingAnalytics(
        weekly_publishes=[
            WeeklyPublish(week=str(r.week.date()), count=r.count) for r in rows
        ]
    )


async def get_users_analytics(date_range: str, db: AsyncSession) -> UsersAnalytics:
    cutoff = _date_cutoff(date_range)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_articles = (
        await db.execute(select(func.count(Content.id)).where(Content.status == "published"))
    ).scalar() or 0
    total_views = (await db.execute(select(func.sum(Content.view_count)))).scalar() or 0

    signup_stmt = (
        select(cast(User.created_at, Date).label("date"), func.count(User.id).label("count"))
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    if cutoff:
        signup_stmt = signup_stmt.where(User.created_at >= cutoff)

    signup_rows = (await db.execute(signup_stmt)).all()

    return UsersAnalytics(
        total_users=total_users,
        total_articles=total_articles,
        total_views=total_views,
        daily_signups=[DailySignup(date=str(r.date), count=r.count) for r in signup_rows],
    )


async def log_search(query: str, user_id: int | None, result_count: int | None, db: AsyncSession) -> None:
    entry = SearchLog(
        user_id=user_id,
        query=query,
        result_count=result_count,
        searched_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    await db.commit()