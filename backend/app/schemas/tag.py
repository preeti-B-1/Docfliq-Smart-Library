from pydantic import BaseModel

from app.schemas.content import TagResponse


class TagRenameRequest(BaseModel):
    name: str


class TagMergeRequest(BaseModel):
    source_ids: list[int]
    target_id: int


class TagWithCountResponse(TagResponse):
    content_count: int
