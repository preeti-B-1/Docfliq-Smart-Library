from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TagInput(BaseModel):
    id: Optional[int] = None
    name: str
    type: str


class ContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    body_text: Optional[str] = None
    ai_summary: Optional[str] = None
    tags: Optional[list[TagInput]] = None


class ContentListItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    ai_summary: Optional[str]
    specialty_tags: list[str]
    topic_tags: list[str]
    difficulty_tag: Optional[str]
    view_count: int
    published_at: Optional[datetime]
    is_bookmarked: bool


class PaginatedContentResponse(BaseModel):
    items: list[ContentListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TagResponse(BaseModel):
    id: int
    name: str
    type: str
    is_fixed: bool

    model_config = {"from_attributes": True}


class ContentUploadResponse(BaseModel):
    id: int
    processing_status: str


class ContentStatusResponse(BaseModel):
    id: int
    processing_status: str


class ContentCardResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    ai_summary: Optional[str]
    view_count: int
    status: str
    processing_status: str
    tags: list[TagResponse]
    created_at: datetime
    published_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ContentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    body_text: str
    status: str
    processing_status: str
    ai_summary: Optional[str]
    view_count: int
    tags: list[TagResponse]
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]

    model_config = {"from_attributes": True}
