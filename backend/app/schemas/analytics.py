from datetime import datetime

from pydantic import BaseModel


class AIFallbackEvent(BaseModel):
    content_id: int
    error_message: str | None
    duration_ms: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AIProviderStats(BaseModel):
    total_calls: int
    claude_calls: int
    fallback_calls: int
    fallback_rate: float
    claude_success_rate: float
    gpt_success_rate: float
    recent_fallbacks: list[AIFallbackEvent]
    ask_ai_claude_failures: int
    ask_ai_gpt_fallbacks: int
    recent_ask_ai_fallbacks: list[AIFallbackEvent]


class TopArticleView(BaseModel):
    id: int
    title: str
    view_count: int


class TagPopularity(BaseModel):
    name: str
    article_count: int


class SearchTermFrequency(BaseModel):
    query: str
    count: int


class ZeroResultSearch(BaseModel):
    query: str
    count: int


class WeeklyPublish(BaseModel):
    week: str
    count: int


class PublishingAnalytics(BaseModel):
    weekly_publishes: list[WeeklyPublish]


class DailySignup(BaseModel):
    date: str
    count: int


class ViewsAnalytics(BaseModel):
    top_articles: list[TopArticleView]


class TagsAnalytics(BaseModel):
    specialties: list[TagPopularity]


class SearchesAnalytics(BaseModel):
    top_searches: list[SearchTermFrequency]
    zero_result_searches: list[ZeroResultSearch]


class UsersAnalytics(BaseModel):
    total_users: int
    total_articles: int
    total_views: int
    daily_signups: list[DailySignup]


class SearchLogRequest(BaseModel):
    query: str
    result_count: int | None = None
